import {
	Controller,
	Post,
	Body,
	Get,
	Request,
	BadRequestException,
} from "@nestjs/common";
import type { RequestWithUser } from "./types/request.types";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { FirstUserDto } from "./dto/first-user.dto";
import { ChallengeRequestDto } from "./dto/challenge-request.dto";
import { Public } from "./decorators/public.decorator";

@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

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
	async registerFirstUser(@Body() firstUserDto: FirstUserDto) {
		// 既存ユーザーがいる場合は最初のユーザー登録を許可しない
		const hasExistingUsers = await this.authService.hasExistingUsers();
		if (hasExistingUsers) {
			throw new BadRequestException("既にユーザーが存在します");
		}

		// 最初のユーザー登録（自動的に管理者に）
		return this.authService.registerFirstUser(firstUserDto);
	}

	@Post("register")
	@Public()
	async register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Post("challenge")
	@Public()
	async createChallenge(@Body() challengeDto: ChallengeRequestDto) {
		return this.authService.createLoginChallenge(challengeDto.username);
	}

	@Post("login")
	@Public()
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
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
