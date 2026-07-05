import {
	Controller,
	ForbiddenException,
	Get,
	Query,
	Res,
} from "@nestjs/common";
import { createAppLogger } from "../../common/logger";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUserId } from "../../auth/decorators/current-user-id.decorator";
import { PermissionsService } from "../../auth/permissions.service";
import { ProgramInfoService } from "./program-info.service";

@ApiTags("program-info")
@Controller("programInfo")
export class ProgramInfoController {
	private readonly logger = createAppLogger(ProgramInfoController.name);

	constructor(
		private readonly programInfoService: ProgramInfoService,
		private readonly permissionsService: PermissionsService,
	) {}

	@Get()
	@ApiQuery({
		name: "filePath",
		required: true,
		description: "動画ファイルパス",
	})
	@ApiResponse({ status: 200, description: "番組情報取得成功" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async getProgramInfo(
		@Query("filePath") filePath: string,
		@CurrentUserId() userId: string,
		@Res({ passthrough: true }) response: Response,
	) {
		try {
			const hasAccess = await this.permissionsService.checkFileAccess(
				userId,
				filePath,
			);
			if (!hasAccess) {
				throw new ForbiddenException("この動画にアクセスする権限がありません");
			}

			const result = await this.programInfoService.getProgramInfo(filePath);

			if (!result.success) {
				if (result.error?.includes("指定されていません")) {
					response.status(400);
					return { error: result.error };
				}
				return {
					success: false,
					programInfo: result.programInfo,
					message: result.message,
				};
			}

			return {
				success: true,
				programInfo: result.programInfo,
				filePath: result.filePath,
			};
		} catch (error) {
			this.logger.error("番組情報の取得エラー:", error);
			response.status(500);
			return {
				error: "番組情報の取得に失敗しました",
			};
		}
	}
}
