import {
	Body,
	Controller,
	Get,
	Patch,
	Request,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type { RequestWithUser } from "../../auth/types/request.types";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get("me")
	async getMe(@Request() req: RequestWithUser) {
		return this.usersService.getCurrentUser(req.user.userId);
	}

	@Get("me/profile")
	async getProfile(@Request() req: RequestWithUser) {
		return this.usersService.getCurrentUser(req.user.userId);
	}

	@Patch("me/profile")
	async updateProfile(
		@Request() req: RequestWithUser,
		@Body() body: UpdateUserProfileDto,
	) {
		return this.usersService.updateProfile(req.user.userId, body);
	}

	@Patch("me/password")
	async updatePassword(
		@Request() req: RequestWithUser,
		@Body() body: UpdatePasswordDto,
	) {
		await this.usersService.updatePassword(req.user.userId, body);
		return { message: "パスワードを更新しました" };
	}
}
