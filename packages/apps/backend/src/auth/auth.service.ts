import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtSignOptions } from "@nestjs/jwt";
import { PrismaService } from "../common/database/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { FirstUserDto } from "./dto/first-user.dto";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
	challengeCryptoConfig,
	computeChallengeResponse,
	generateAuthSalt,
	safeCompareHex,
} from "./password.utils";

interface ChallengeTokenPayload {
	sub: string;
	username: string;
	challenge: string;
	version: number;
	iat?: number;
	exp?: number;
}

interface ChallengeValidationOptions {
	expectedUsername?: string;
	expectedUserId?: string;
}

interface ValidatedUser {
	id: string;
	username: string;
	email: string | null;
	role: string;
}

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
	) {}

	async register(registerDto: RegisterDto) {
		const { username, email, passwordSalt, passwordVerifier } = registerDto;

		// 既存ユーザーの数をチェック
		const userCount = await this.prisma.user.count();

		// ユーザー名の重複チェック
		const existingUser = await this.prisma.user.findFirst({
			where: {
				OR: [{ username }, { email }],
			},
		});

		if (existingUser) {
			throw new UnauthorizedException(
				"ユーザー名またはメールアドレスは既に使用されています",
			);
		}

		// パスワードのハッシュ化
		const hashedPassword = await bcrypt.hash(passwordVerifier, 10);

		// 最初のユーザーの場合は自動的に管理者にする
		const role = userCount === 0 ? "ADMIN" : "USER";

		// ユーザーの作成
		const user = await this.prisma.user.create({
			data: {
				username,
				email,
				passwordHash: hashedPassword,
				passwordVerifier,
				authSalt: passwordSalt,
				role,
			},
		});

		// 管理者権限を付与（最初のユーザーの場合）
		if (role === "ADMIN") {
			// 管理者に全ディレクトリのアクセス権を付与
			await this.prisma.permission.create({
				data: {
					userId: user.id,
					directoryPath: "/",
					canRead: true,
					canWrite: true,
				},
			});
		}

		// JWTトークンの生成
		const payload = { sub: user.id, username: user.username, role: user.role };
		const access_token = this.jwtService.sign(payload);

		return {
			access_token,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role,
			},
		};
	}

	private async consumeChallenge(
		challengeToken: string,
		response: string,
		options?: ChallengeValidationOptions,
	): Promise<ValidatedUser> {
		let challengePayload: ChallengeTokenPayload;
		try {
			challengePayload = this.jwtService.verify<ChallengeTokenPayload>(
				challengeToken,
				{ ignoreExpiration: false },
			);
		} catch {
			throw new UnauthorizedException("チャレンジが無効または期限切れです");
		}

		if (
			options?.expectedUsername &&
			challengePayload.username !== options.expectedUsername
		) {
			throw new UnauthorizedException("チャレンジとユーザーが一致しません");
		}

		if (
			options?.expectedUserId &&
			challengePayload.sub !== options.expectedUserId
		) {
			throw new UnauthorizedException("チャレンジとユーザーが一致しません");
		}

		const user = await this.prisma.user.findUnique({
			where: { username: challengePayload.username },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				passwordVerifier: true,
				isActive: true,
				challengeVersion: true,
			},
		});

		if (!user || !user.passwordVerifier || !user.isActive) {
			throw new UnauthorizedException(
				"ユーザー名またはパスワードが正しくありません",
			);
		}

		if (
			challengePayload.sub !== "anonymous" &&
			challengePayload.sub !== user.id
		) {
			throw new UnauthorizedException("チャレンジが無効です");
		}

		if (user.challengeVersion !== challengePayload.version) {
			throw new UnauthorizedException("このチャレンジは失効しています");
		}

		const expectedResponse = computeChallengeResponse(
			user.passwordVerifier,
			challengePayload.challenge,
		);

		if (!safeCompareHex(expectedResponse, response)) {
			throw new UnauthorizedException(
				"ユーザー名またはパスワードが正しくありません",
			);
		}

		const versionUpdate = await this.prisma.user.updateMany({
			where: {
				id: user.id,
				challengeVersion: challengePayload.version,
			},
			data: {
				challengeVersion: challengePayload.version + 1,
			},
		});

		if (versionUpdate.count === 0) {
			throw new UnauthorizedException("このチャレンジは既に使用済みです");
		}

		return {
			id: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
		};
	}

	async verifyChallengeResponse(
		challengeToken: string,
		response: string,
		options?: ChallengeValidationOptions,
	): Promise<ValidatedUser> {
		return this.consumeChallenge(challengeToken, response, options);
	}

	async login(loginDto: LoginDto) {
		const { username, challengeToken, response } = loginDto;
		const user = await this.verifyChallengeResponse(challengeToken, response, {
			expectedUsername: username,
		});

		const payload = { sub: user.id, username: user.username, role: user.role };
		const access_token = this.jwtService.sign(payload);

		return {
			access_token,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role,
			},
		};
	}

	async createLoginChallenge(username: string) {
		const user = await this.prisma.user.findUnique({
			where: { username },
			select: {
				id: true,
				authSalt: true,
				passwordVerifier: true,
				challengeVersion: true,
			},
		});

		const challenge = randomBytes(32).toString("hex");
		const salt = user?.authSalt ?? generateAuthSalt();
		const nextVersion = (user?.challengeVersion ?? 0) + 1;

		if (user) {
			if (!user.passwordVerifier) {
				throw new UnauthorizedException(
					"このアカウントはパスワードの再設定が必要です。管理者に連絡してください。",
				);
			}

			await this.prisma.user.update({
				where: { id: user.id },
				data: {
					authSalt: salt,
					challengeVersion: nextVersion,
				},
			});
		}

		const challengeToken = this.jwtService.sign(
			{
				sub: user?.id ?? "anonymous",
				username,
				challenge,
				version: nextVersion,
			},
			{ expiresIn: challengeCryptoConfig.tokenExpiry } as JwtSignOptions,
		);

		return {
			challenge,
			challengeToken,
			salt,
			iterations: challengeCryptoConfig.iterations,
			keyLength: challengeCryptoConfig.keyLength,
			digest: challengeCryptoConfig.webDigest,
		};
	}

	async validateUser(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				isActive: true,
			},
		});

		if (!user || !user.isActive) {
			throw new UnauthorizedException(
				"ユーザーが見つからないか、無効になっています",
			);
		}

		return user;
	}

	async hasExistingUsers(): Promise<boolean> {
		try {
			// DB接続チェック
			await this.prisma.$queryRaw`SELECT 1`;
			// ユーザーテーブル存在チェック
			const tableExists = (await this.prisma.$queryRaw`
				SELECT name FROM sqlite_master
				WHERE type='table' AND name='users'
			`) as Array<{ name: string }>;

			if (tableExists.length === 0) {
				return false;
			}

			// ユーザー数チェック
			let userCount = 0;
			try {
				userCount = await this.prisma.user.count();
			} catch (countError) {
				console.warn(
					"User count check failed:",
					countError instanceof Error ? countError.message : "Unknown error",
				);
				// 直接SQLでユーザー数を確認
				const directCount = (await this.prisma.$queryRaw`
					SELECT COUNT(*) as count FROM users
				`) as Array<{ count: number }>;
				userCount = directCount[0]?.count || 0;
			}
			return userCount > 0;
		} catch (error) {
			// DB接続エラーやテーブル不存在の場合はfalseを返す
			if (error instanceof Error) {
				console.warn("First user check failed:", error.message);
			}
			console.log("Error case: returning false");
			return false;
		}
	}

	async checkUserExists(userId: string): Promise<boolean> {
		try {
			const user = await this.prisma.user.findUnique({
				where: { id: userId },
				select: { id: true, isActive: true },
			});
			return user?.isActive ?? false;
		} catch {
			return false;
		}
	}

	async registerFirstUser(firstUserDto: FirstUserDto) {
		const { username, passwordSalt, passwordVerifier } = firstUserDto;

		// 既存ユーザーがいる場合は最初のユーザー登録を許可しない
		const hasExistingUsers = await this.hasExistingUsers();
		if (hasExistingUsers) {
			throw new UnauthorizedException("既にユーザーが存在します");
		}

		// パスワードのハッシュ化
		const hashedPassword = await bcrypt.hash(passwordVerifier, 10);

		// 最初のユーザーを管理者として作成
		const user = await this.prisma.user.create({
			data: {
				username,
				email: `${username}@maine.local`, // 自動的にメールアドレスを生成
				passwordHash: hashedPassword,
				passwordVerifier,
				authSalt: passwordSalt,
				role: "ADMIN",
			},
		});

		// 管理者に全ディレクトリのアクセス権を付与
		await this.prisma.permission.create({
			data: {
				userId: user.id,
				directoryPath: "/",
				canRead: true,
				canWrite: true,
			},
		});

		// JWTトークンの生成
		const payload = { sub: user.id, username: user.username, role: user.role };
		const access_token = this.jwtService.sign(payload);

		return {
			access_token,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role,
			},
		};
	}
}
