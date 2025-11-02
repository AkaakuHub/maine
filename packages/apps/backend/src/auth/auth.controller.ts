import {
	Controller,
	Post,
	Body,
	UseGuards,
	Get,
	Request,
	BadRequestException,
} from "@nestjs/common";
import type { RequestWithUser } from "./types/request.types";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { FirstUserDto } from "./dto/first-user.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get("check-first-user")
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
	async register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Post("login")
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@Get("profile")
	@UseGuards(JwtAuthGuard)
	async getProfile(@Request() req: RequestWithUser) {
		return req.user;
	}

	@Get("validate")
	@UseGuards(JwtAuthGuard)
	async validateToken(@Request() req: RequestWithUser) {
		// トークンが有効な場合、ユーザー情報を返す
		return {
			valid: true,
			user: req.user,
		};
	}
}
