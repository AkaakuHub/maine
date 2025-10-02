import { createReadStream, statSync } from "node:fs";
import {
	Controller,
	Get,
	NotFoundException,
	Param,
	Query,
	Res,
	Headers,
	InternalServerErrorException,
} from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags, ApiParam } from "@nestjs/swagger";
import type { Response } from "express";
import { findFileInVideoDirectories } from "@/libs/fileUtils";

@ApiTags("video")
@Controller("video")
export class VideoController {
	@Get("*filePath")
	@ApiParam({ name: "filePath", description: "動画ファイルパス" })
	@ApiQuery({
		name: "download",
		required: false,
		description: "ダウンロードモード (true/false)",
	})
	@ApiResponse({ status: 200, description: "動画配信" })
	@ApiResponse({ status: 206, description: "部分配信 (Rangeリクエスト)" })
	@ApiResponse({ status: 404, description: "ファイルが見つからない" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async streamVideo(
		@Param("filePath") filePath: string,
		@Res() res: Response,
		@Headers() headers: Record<string, string>,
		@Query("download") isDownload?: string,
	) {
		try {
			const decodedPath = decodeURIComponent(filePath);
			const downloadMode = isDownload === "true";

			// 複数のビデオディレクトリからファイルを検索
			const fileValidation = await findFileInVideoDirectories(decodedPath);

			if (!fileValidation.isValid || !fileValidation.exists) {
				console.error("File not found or invalid:", {
					filePath: decodedPath,
					error: fileValidation.error,
				});

				if (fileValidation.error === "No video directories configured") {
					throw new InternalServerErrorException({
						error: fileValidation.error,
					});
				}

				throw new NotFoundException({
					error: fileValidation.error || "File not found",
				});
			}

			const fullPath = fileValidation.fullPath;
			const stat = statSync(fullPath);
			const fileSize = stat.size;
			const range = headers.range;

			// Range リクエストの処理（動画ストリーミング用）
			if (range) {
				const parts = range.replace(/bytes=/, "").split("-");
				const start = Number.parseInt(parts[0], 10);
				let end =
					parts[1] && parts[1].trim() !== ""
						? Number.parseInt(parts[1], 10)
						: fileSize - 1;

				// 大きなチャンクを制限（最大10MB）
				const maxChunkSize = 10 * 1024 * 1024;
				if (end - start + 1 > maxChunkSize) {
					end = start + maxChunkSize - 1;
				}

				const chunksize = end - start + 1;

				const file = createReadStream(fullPath, { start, end });

				// レスポンスヘッダー設定
				res.status(206);
				res.set({
					"Content-Range": `bytes ${start}-${end}/${fileSize}`,
					"Accept-Ranges": "bytes",
					"Content-Length": chunksize.toString(),
					"Content-Type": "video/mp4",
					"Cache-Control": "public, max-age=31536000",
					"Access-Control-Allow-Origin": "*",
				});

				// ダウンロードモードの場合はContent-Dispositionヘッダーを追加
				if (downloadMode) {
					const fileName = decodedPath.split(/[/\\]/).pop() || "video.mp4";
					// RFC 5987に準拠したファイル名エンコード（新しいブラウザ用）
					const encodedFileName = encodeURIComponent(fileName);
					// ASCII文字のみの場合はシンプルな形式も併記（古いブラウザ用）
					const containsNonAscii = fileName
						.split("")
						.some((char) => char.charCodeAt(0) > 127);
					const dispositionValue = containsNonAscii
						? `attachment; filename="video.mp4"; filename*=UTF-8''${encodedFileName}`
						: `attachment; filename="${fileName}"`;
					res.set("Content-Disposition", dispositionValue);
				}

				return file.pipe(res);
			}

			// Range リクエストがない場合は全体を返す
			const file = createReadStream(fullPath);

			res.status(200);
			res.set({
				"Content-Length": fileSize.toString(),
				"Content-Type": "video/mp4",
				"Accept-Ranges": "bytes",
				"Cache-Control": "public, max-age=31536000",
				"Access-Control-Allow-Origin": "*",
			});

			// ダウンロードモードの場合はContent-Dispositionヘッダーを追加
			if (downloadMode) {
				const fileName = decodedPath.split(/[/\\]/).pop() || "video.mp4";
				// RFC 5987に準拠したファイル名エンコード（新しいブラウザ用）
				const encodedFileName = encodeURIComponent(fileName);
				// ASCII文字のみの場合はシンプルな形式も併記（古いブラウザ用）
				const containsNonAscii = fileName
					.split("")
					.some((char) => char.charCodeAt(0) > 127);
				const dispositionValue = containsNonAscii
					? `attachment; filename="video.mp4"; filename*=UTF-8''${encodedFileName}`
					: `attachment; filename="${fileName}"`;
				res.set("Content-Disposition", dispositionValue);
			}

			return file.pipe(res);
		} catch (error) {
			console.error("Video streaming error:", error);
			if (
				error instanceof NotFoundException ||
				error instanceof InternalServerErrorException
			) {
				throw error;
			}
			throw new InternalServerErrorException({
				error: "Internal server error",
			});
		}
	}
}
