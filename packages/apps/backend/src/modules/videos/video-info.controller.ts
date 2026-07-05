import {
	Controller,
	Get,
	Param,
	HttpException,
	HttpStatus,
	ForbiddenException,
} from "@nestjs/common";
import { createAppLogger } from "../../common/logger";
import { VideosService } from "./videos.service";
import { ApiTags, ApiParam, ApiResponse } from "@nestjs/swagger";
import { PermissionsService } from "../../auth/permissions.service";
import { CurrentUserId } from "../../auth/decorators/current-user-id.decorator";

@ApiTags("videos")
@Controller("videos")
export class VideoInfoController {
	private readonly logger = createAppLogger(VideoInfoController.name);

	constructor(
		private readonly videosService: VideosService,
		private readonly permissionsService: PermissionsService,
	) {}

	@Get("by-id/:id")
	@ApiParam({ name: "id", description: "動画ID" })
	@ApiResponse({ status: 200, description: "動画情報の取得成功" })
	@ApiResponse({ status: 404, description: "動画が見つからない" })
	@ApiResponse({ status: 400, description: "無効なID" })
	@ApiResponse({ status: 401, description: "認証が必要" })
	@ApiResponse({ status: 403, description: "アクセス権限なし" })
	async getVideoById(@Param("id") id: string, @CurrentUserId() userId: string) {
		const result = await this.videosService.getVideoByIdForApi(id);

		if (!result.success || !result.video) {
			throw new HttpException(
				result.error || "Video not found",
				HttpStatus.NOT_FOUND,
			);
		}

		const hasAccess = await this.permissionsService.checkFileAccess(
			userId,
			result.video.filePath,
		);

		if (!hasAccess) {
			this.logger.warn(
				`User ${userId} attempted to access video without permission: ${result.video.filePath}`,
			);
			throw new ForbiddenException("この動画にアクセスする権限がありません");
		}

		return result;
	}
}
