import { Body, Controller, Get, Patch, Request } from "@nestjs/common";
import type { RequestWithUser } from "../../auth/types/request.types";
import { CurrentUserId } from "../../auth/decorators/current-user-id.decorator";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get("me")
	async getMe(@CurrentUserId() userId: string) {
		return this.usersService.getCurrentUser(userId);
	}

	@Get("me/profile")
	async getProfile(@CurrentUserId() userId: string) {
		return this.usersService.getCurrentUser(userId);
	}

	@Patch("me/profile")
	async updateProfile(
		@CurrentUserId() userId: string,
		@Body() body: UpdateUserProfileDto,
	) {
		return this.usersService.updateProfile(userId, body);
	}

	@Patch("me/password")
	async updatePassword(
		@CurrentUserId() userId: string,
		@Request() req: RequestWithUser,
		@Body() body: UpdatePasswordDto,
	) {
		await this.usersService.updatePassword(userId, req.user.username, body);
		return { message: "パスワードを更新しました" };
	}
}
