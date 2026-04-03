import {
	BadRequestException,
	Body,
	Controller,
	ForbiddenException,
	Get,
	Logger,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UpdateProgressDto } from "./dto/update-progress.dto";
import { ProgressService } from "./progress.service";
import { CurrentUserId } from "../../auth/decorators/current-user-id.decorator";
import { PermissionsService } from "../../auth/permissions.service";

@ApiTags("progress")
@Controller("progress")
export class ProgressController {
	private readonly logger = new Logger(ProgressController.name);

	constructor(
		private readonly progressService: ProgressService,
		private readonly permissionsService: PermissionsService,
	) {}

	@Get()
	@ApiQuery({
		name: "filePath",
		required: true,
		description: "動画ファイルパス",
	})
	@ApiResponse({ status: 200, description: "動画進捗取得" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 403, description: "アクセス権限なし" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async getVideoProgress(
		@Query("filePath") filePath: string,
		@CurrentUserId() userId: string,
	) {
		try {
			const hasAccess = await this.permissionsService.checkFileAccess(
				userId,
				filePath,
			);
			if (!hasAccess) {
				throw new ForbiddenException("この動画にアクセスする権限がありません");
			}

			const result = await this.progressService.getVideoProgress(
				filePath,
				userId,
			);

			if (!result.success) {
				if (result.error?.includes("required")) {
					throw new BadRequestException({ error: result.error });
				}
				throw new BadRequestException({
					error: result.error || "動画進捗の取得に失敗しました",
				});
			}

			return result;
		} catch (error) {
			this.logger.error("Error fetching video progress:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				error: "Failed to fetch video progress",
			});
		}
	}

	@Post()
	@ApiResponse({ status: 200, description: "動画進捗更新" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 403, description: "アクセス権限なし" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async updateVideoProgress(
		@Body() updateData: UpdateProgressDto,
		@CurrentUserId() userId: string,
	) {
		try {
			const hasAccess = await this.permissionsService.checkFileAccess(
				userId,
				updateData.filePath,
			);
			if (!hasAccess) {
				throw new ForbiddenException("この動画にアクセスする権限がありません");
			}

			const result = await this.progressService.updateVideoProgress(
				updateData,
				userId,
			);

			if (!result.success) {
				if (result.error?.includes("required")) {
					throw new BadRequestException({ error: result.error });
				}
				throw new BadRequestException({
					error: result.error || "動画の更新に失敗しました",
				});
			}

			return result;
		} catch (error) {
			this.logger.error("Error updating video:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				error: "Failed to update video",
			});
		}
	}

	@Put()
	@ApiResponse({ status: 200, description: "動画進捗更新" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async updateVideoProgressPut(
		@Body() updateData: UpdateProgressDto,
		@CurrentUserId() userId: string,
	) {
		// POSTと同じ処理
		return this.updateVideoProgress(updateData, userId);
	}
}
