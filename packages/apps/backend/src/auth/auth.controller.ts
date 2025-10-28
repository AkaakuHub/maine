import {
	Controller,
	Post,
	Body,
	UseGuards,
	Get,
	Request,
	BadRequestException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { MigrationService } from "./migration.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { FirstUserDto } from "./dto/first-user.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Roles } from "./decorators/roles.decorator";
import { RolesGuard } from "./roles.guard";

@Controller("auth")
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly migrationService: MigrationService,
	) {}

	@Get("check-first-user")
	async checkFirstUser() {
		const hasExistingUsers = await this.authService.hasExistingUsers();
		return { isFirstUser: !hasExistingUsers };
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
	async getProfile(@Request() req) {
		return req.user;
	}

	@Post("create-admin")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("ADMIN")
	async createAdmin() {
		return this.authService.createDefaultAdmin();
	}

	@Post("migrate")
	async migrateData() {
		return this.migrationService.migrateExistingData();
	}
}
