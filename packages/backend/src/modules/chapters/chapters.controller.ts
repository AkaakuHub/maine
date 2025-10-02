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
import { ChaptersService } from "./chapters.service";

@ApiTags("chapters")
@Controller("chapters")
export class ChaptersController {
	private readonly logger = new Logger(ChaptersController.name);

	constructor(private readonly chaptersService: ChaptersService) {}

	@Get()
	@ApiQuery({
		name: "filePath",
		required: true,
		description: "動画ファイルパス",
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
		@Query("filePath") filePath: string,
		@Query("format") format?: string,
		@Res({ passthrough: true }) res?: Response,
	) {
		try {
			if (!filePath) {
				throw new BadRequestException({
					error: "ファイルパスが必要です",
				});
			}

			const decodedPath = decodeURIComponent(filePath);

			// ファイルの存在確認
			const fileValidation =
				await this.chaptersService.validateFileExists(decodedPath);
			if (!fileValidation.isValid || !fileValidation.exists) {
				throw new BadRequestException({
					error: "動画ファイルが見つかりません",
				});
			}

			// チャプター情報を抽出
			const chapters = await this.chaptersService.extractVideoChapters(
				fileValidation.fullPath || decodedPath,
			);

			if (format === "webvtt") {
				// WebVTT形式で返す（HTML5 video要素用）
				const webvtt = this.chaptersService.convertChaptersToWebVTT(chapters);

				if (res) {
					res.set("Content-Type", "text/vtt; charset=utf-8");
					res.set("Cache-Control", "public, max-age=86400"); // 24時間キャッシュ
				}

				return new Response(webvtt, {
					headers: {
						"Content-Type": "text/vtt; charset=utf-8",
						"Cache-Control": "public, max-age=86400", // 24時間キャッシュ
					},
				});
			}

			// JSON形式で返す（デフォルト）
			return {
				success: true,
				chapters,
				hasChapters: chapters.length > 0,
			};
		} catch (error) {
			this.logger.error("Error extracting video chapters:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				error: "動画チャプターの抽出に失敗しました",
			});
		}
	}
}
