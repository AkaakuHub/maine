import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	Res,
} from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { VideoChapter } from "./chapters.service";
import { ChaptersService } from "./chapters.service";

type GetVideoChaptersResponse =
	| { success: true; chapters: VideoChapter[]; hasChapters: boolean }
	| {
			success: true;
			message: string;
			chapters?: VideoChapter[];
			hasChapters?: boolean;
	  }
	| string;

@ApiTags("chapters")
@Controller("chapters")
export class ChaptersController {
	private readonly logger = new Logger(ChaptersController.name);

	constructor(private readonly chaptersService: ChaptersService) {}

	@Get()
	@ApiQuery({
		name: "id",
		required: true,
		description: "動画ID",
	})
	@ApiQuery({
		name: "format",
		required: false,
		description: "出力フォーマット (json/webvtt)",
		enum: ["json", "webvtt"],
	})
	@ApiResponse({ status: 200, description: "チャプター情報取得" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 404, description: "ファイルが見つからない" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async getVideoChapters(
		@Query("id") id: string,
		@Query("format") format?: string,
		@Res({ passthrough: true }) res?: Response,
	): Promise<GetVideoChaptersResponse> {
		try {
			if (!id) {
				throw new BadRequestException({
					error: "idが必要です",
				});
			}

			const filePath = await this.chaptersService.getFilePathById(id);
			if (!filePath) {
				throw new BadRequestException({
					error: "動画が見つかりません",
				});
			}

			// ファイルの存在確認
			const fileValidation =
				await this.chaptersService.validateFileExists(filePath);
			if (!fileValidation.isValid || !fileValidation.exists) {
				throw new BadRequestException({
					error: "動画ファイルが見つかりません",
				});
			}

			// チャプター情報を抽出
			const chapters = await this.chaptersService.extractVideoChapters(
				fileValidation.fullPath || filePath,
			);

			if (format === "webvtt") {
				// WebVTT形式で返す（HTML5 video要素用）
				const webvtt = this.chaptersService.convertChaptersToWebVTT(chapters);

				if (res) {
					res.set("Content-Type", "text/vtt; charset=utf-8");
					res.set("Cache-Control", "public, max-age=86400"); // 24時間キャッシュ
				}

				return webvtt;
			}

			// JSON形式で返す（デフォルト）
			return {
				success: true,
				chapters,
				hasChapters: chapters.length > 0,
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				// 予期されるエラー（ファイルが存在しないなど） - 警告レベルでログ
				this.logger.warn("Expected error in chapters extraction:", error);
				throw error;
			}
			// 予期せぬエラーのみエラーログ
			this.logger.error("Unexpected error extracting video chapters:", error);
			throw new BadRequestException({
				error: "動画チャプターの抽出に失敗しました",
			});
		}
	}
}
