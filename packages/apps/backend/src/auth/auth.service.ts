import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/database/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { FirstUserDto } from "./dto/first-user.dto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
	) {}

	async register(registerDto: RegisterDto) {
		const { username, email, password } = registerDto;

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
		const hashedPassword = await bcrypt.hash(password, 10);

		// 最初のユーザーの場合は自動的に管理者にする
		const role = userCount === 0 ? "ADMIN" : "USER";

		// ユーザーの作成
		const user = await this.prisma.user.create({
			data: {
				username,
				email,
				passwordHash: hashedPassword,
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

	async login(loginDto: LoginDto) {
		const { username, password } = loginDto;

		// ユーザーの検索
		const user = await this.prisma.user.findUnique({
			where: { username },
		});

		if (!user) {
			throw new UnauthorizedException(
				"ユーザー名またはパスワードが正しくありません",
			);
		}

		// パスワードの検証
		const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
		if (!isPasswordValid) {
			throw new UnauthorizedException(
				"ユーザー名またはパスワードが正しくありません",
			);
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
		const userCount = await this.prisma.user.count();
		return userCount > 0;
	}

	async registerFirstUser(firstUserDto: FirstUserDto) {
		const { username, password } = firstUserDto;

		// 既存ユーザーがいる場合は最初のユーザー登録を許可しない
		const hasExistingUsers = await this.hasExistingUsers();
		if (hasExistingUsers) {
			throw new UnauthorizedException("既にユーザーが存在します");
		}

		// パスワードのハッシュ化
		const hashedPassword = await bcrypt.hash(password, 10);

		// 最初のユーザーを管理者として作成
		const user = await this.prisma.user.create({
			data: {
				username,
				email: `${username}@maine.local`, // 自動的にメールアドレスを生成
				passwordHash: hashedPassword,
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

	async createDefaultAdmin() {
		// 既存の管理者ユーザーをチェック
		const existingAdmin = await this.prisma.user.findFirst({
			where: { role: "ADMIN" },
		});

		if (existingAdmin) {
			return existingAdmin;
		}

		// デフォルト管理者ユーザーの作成
		const defaultPassword = "admin123";
		const hashedPassword = await bcrypt.hash(defaultPassword, 10);

		const adminUser = await this.prisma.user.create({
			data: {
				username: "admin",
				email: "admin@maine.local",
				passwordHash: hashedPassword,
				role: "ADMIN",
			},
		});

		console.log("デフォルト管理者ユーザーを作成しました:");
		console.log("ユーザー名: admin");
		console.log("パスワード: admin123");
		console.log("※初回ログイン後にパスワードを変更してください");

		return adminUser;
	}
}
