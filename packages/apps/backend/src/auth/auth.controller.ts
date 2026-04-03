import {
	Controller,
	Post,
	Body,
	Get,
	Request,
	BadRequestException,
	Res,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithUser } from "./types/request.types";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { FirstUserDto } from "./dto/first-user.dto";
import { ChallengeRequestDto } from "./dto/challenge-request.dto";
import { Public } from "./decorators/public.decorator";

const ACCESS_TOKEN_COOKIE_NAME = "access_token";
const ACCESS_TOKEN_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const AUTH_COOKIE_SAMESITE = "none" as const;
const AUTH_COOKIE_SECURE = true;

@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	private setAuthCookie(response: Response, token: string): void {
		response.cookie(ACCESS_TOKEN_COOKIE_NAME, token, {
			httpOnly: true,
			secure: AUTH_COOKIE_SECURE,
			sameSite: AUTH_COOKIE_SAMESITE,
			path: "/",
			maxAge: ACCESS_TOKEN_MAX_AGE_MS,
		});
	}

	private clearAuthCookie(response: Response): void {
		response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
			httpOnly: true,
			secure: AUTH_COOKIE_SECURE,
			sameSite: AUTH_COOKIE_SAMESITE,
			path: "/",
		});
	}

	@Get("check-first-user")
	@Public()
	async checkFirstUser() {
		try {
			const hasExistingUsers = await this.authService.hasExistingUsers();
			return {
				isFirstUser: !hasExistingUsers,
				databaseReady: true,
				message: hasExistingUsers
					? "既存ユーザーが存在します"
					: "最初のユーザーを登録してください",
			};
		} catch {
			return {
				isFirstUser: true,
				databaseReady: false,
				message: "データベースの準備ができていません",
			};
		}
	}

	@Post("first-user")
	@Public()
	async registerFirstUser(
		@Body() firstUserDto: FirstUserDto,
		@Res({ passthrough: true }) response: Response,
	) {
		// 既存ユーザーがいる場合は最初のユーザー登録を許可しない
		const hasExistingUsers = await this.authService.hasExistingUsers();
		if (hasExistingUsers) {
			throw new BadRequestException("既にユーザーが存在します");
		}

		// 最初のユーザー登録（自動的に管理者に）
		const authResult = await this.authService.registerFirstUser(firstUserDto);
		this.setAuthCookie(response, authResult.access_token);
		return authResult;
	}

	@Post("register")
	@Public()
	async register(
		@Body() registerDto: RegisterDto,
		@Res({ passthrough: true }) response: Response,
	) {
		const authResult = await this.authService.register(registerDto);
		this.setAuthCookie(response, authResult.access_token);
		return authResult;
	}

	@Post("challenge")
	@Public()
	async createChallenge(@Body() challengeDto: ChallengeRequestDto) {
		return this.authService.createLoginChallenge(challengeDto.username);
	}

	@Post("login")
	@Public()
	async login(
		@Body() loginDto: LoginDto,
		@Res({ passthrough: true }) response: Response,
	) {
		const authResult = await this.authService.login(loginDto);
		this.setAuthCookie(response, authResult.access_token);
		return authResult;
	}

	@Post("logout")
	@Public()
	logout(@Res({ passthrough: true }) response: Response) {
		this.clearAuthCookie(response);
		return { success: true };
	}

	@Get("profile")
	async getProfile(@Request() req: RequestWithUser) {
		return req.user;
	}

	@Get("validate")
	async validateToken(@Request() req: RequestWithUser) {
		// トークンが有効な場合、ユーザー情報を返す
		return {
			valid: true,
			user: req.user,
		};
	}

	@Get("check-user-exists")
	@Public()
	async checkUserExists(
		@Request() req: { headers: { authorization?: string } },
	) {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return {
				exists: false,
				userId: null,
			};
		}

		try {
			const token = authHeader.substring(7);
			const decoded = JSON.parse(
				Buffer.from(token.split(".")[1], "base64").toString(),
			);
			const userId = decoded.sub;
			const userExists = await this.authService.checkUserExists(userId);

			return {
				exists: userExists,
				userId: userId,
			};
		} catch {
			return {
				exists: false,
				userId: null,
			};
		}
	}
}
