import { createReadStream } from "node:fs";
import { Controller, Get, Param, Query, Res, Headers } from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags, ApiParam } from "@nestjs/swagger";
import type { Response } from "express";
import { VideosService } from "./videos.service";
import { isValidVideoId } from "../../utils/videoIdValidation";

@ApiTags("video")
@Controller("video")
export class VideoController {
	constructor(private readonly videosService: VideosService) {}

	@Get(":videoId")
	@ApiParam({ name: "videoId", description: "64文字のSHA-256ハッシュID" })
	@ApiQuery({
		name: "download",
		required: false,
		description: "ダウンロードモード (true/false)",
	})
	@ApiResponse({ status: 200, description: "動画配信" })
	@ApiResponse({ status: 206, description: "部分配信 (Rangeリクエスト)" })
	@ApiResponse({ status: 400, description: "無効なvideoId" })
	@ApiResponse({ status: 404, description: "動画が見つからない" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async streamVideoByVideoId(
		@Param("videoId") videoId: string,
		@Res() res: Response,
		@Headers() headers: Record<string, string>,
		@Query("download") isDownload?: string,
	) {
		try {
			// videoIdの形式を検証
			if (!isValidVideoId(videoId)) {
				res.status(400).json({
					error: "Invalid videoId format. Expected 64-character SHA-256 hash.",
					status: 400,
				});
				return;
			}

			const downloadMode = isDownload === "true";

			// videoIdから動画メタデータを取得
			const videoData = await this.videosService.getVideoByVideoId(videoId);

			if (!videoData) {
				res.status(404).json({
					error: "Video not found",
					status: 404,
				});
				return;
			}

			const range = headers.range;
			const fileSize = videoData.fileSize;

			if (!range) {
				// レンジリクエストなし：ファイル全体を配信
				res.status(200);
				res.set({
					"Content-Type": "video/mp4",
					"Content-Length": fileSize.toString(),
					"Cache-Control": "public, max-age=31536000",
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Credentials": "true",
				});

				// ダウンロードモードの場合はContent-Dispositionヘッダーを追加
				if (downloadMode) {
					const fileName = videoData.fileName || "video.mp4";
					res.set("Content-Disposition", `attachment; filename="${fileName}"`);
				}

				const file = createReadStream(videoData.filePath);
				return file.pipe(res);
			}

			// Range リクエストの処理（動画ストリーミング用）
			console.log(`Range request received for videoId ${videoId}:`, range);

			const parts = range.replace(/bytes=/, "").split("-");
			const start = Number.parseInt(parts[0], 10);
			const end =
				parts[1] && parts[1].trim() !== ""
					? Number.parseInt(parts[1], 10)
					: fileSize - 1;

			// レンジリクエストのバリデーション
			if (start >= fileSize || (end && end >= fileSize) || start > end) {
				res.status(416).json({
					error: "Requested Range Not Satisfiable",
					status: 416,
				});
				return;
			}

			const chunksize = end - start + 1;

			// レスポンスヘッダー設定
			res.writeHead(206, {
				"Content-Range": `bytes ${start}-${end}/${fileSize}`,
				"Accept-Ranges": "bytes",
				"Content-Length": chunksize.toString(),
				"Content-Type": "video/mp4",
				"Cache-Control": "public, max-age=31536000",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Credentials": "true",
				...(downloadMode && {
					"Content-Disposition": `attachment; filename="${videoData.fileName || "video.mp4"}"`,
				}),
			});

			const file = createReadStream(videoData.filePath, { start, end });
			return file.pipe(res);
		} catch (error) {
			console.error("Video streaming error:", error);

			// @Res()を使用しているため、直接レスポンスを返す
			res.status(500).json({
				error: error instanceof Error ? error.message : "Internal server error",
				status: 500,
			});
		}
	}

	// 古いfilePath方式のアクセスを拒否（後方互換性のためのエラーメッセージ）
	@Get("*path")
	@ApiResponse({
		status: 410,
		description: "古いURL形式はサポートされていません",
	})
	async handleDeprecatedUrl(@Res() res: Response) {
		res.status(410).json({
			error:
				"This URL format is no longer supported. Please use videoId-based URLs.",
			message:
				"The old file path-based URL format has been deprecated. Please use the new videoId format.",
			status: 410,
			suggestion:
				"Update your application to use videoId instead of file paths.",
		});
	}
}
