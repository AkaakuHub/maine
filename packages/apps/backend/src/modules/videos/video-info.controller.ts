import {
	Controller,
	Get,
	Param,
	HttpException,
	HttpStatus,
	UseGuards,
	ForbiddenException,
	Request,
	Logger,
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { VideosService } from "./videos.service";
import { ApiTags, ApiParam, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsService } from "../../auth/permissions.service";

@ApiTags("videos")
@Controller("videos")
@UseGuards(JwtAuthGuard)
export class VideoInfoController {
	private readonly logger = new Logger(VideoInfoController.name);

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
	async getVideoById(
		@Param("id") id: string,
		@Request() req: ExpressRequest & { user?: { userId: string } },
	) {
		// ユーザーIDを取得
		const userId = req.user?.userId;
		if (!userId) {
			this.logger.error(
				`No user ID found in request. User object: ${JSON.stringify(req.user)}`,
			);
			throw new ForbiddenException("認証が必要です");
		}

		const result = await this.videosService.getVideoByIdForApi(id);

		if (!result.success || !result.video) {
			throw new HttpException(
				result.error || "Video not found",
				HttpStatus.NOT_FOUND,
			);
		}

		// 動画のディレクトリパスを取得して権限チェック
		const pathParts = result.video.filePath.split("/");
		const videoDirectory =
			pathParts.length > 1 ? pathParts.slice(0, -1).join("/") || "/" : "/";

		const hasAccess = await this.permissionsService.checkDirectoryAccess(
			userId,
			videoDirectory,
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
