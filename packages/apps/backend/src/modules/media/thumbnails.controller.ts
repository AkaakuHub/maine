import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BadRequestException,
	Controller,
	Get,
	Param,
	Res,
} from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

@ApiTags("media")
@Controller("thumbnails")
export class ThumbnailsController {
	@Get("*path")
	@ApiResponse({ status: 200, description: "サムネイル画像配信" })
	@ApiResponse({ status: 400, description: "無効なパス" })
	@ApiResponse({ status: 404, description: "サムネイルが見つからない" })
	async getThumbnail(@Param("path") path: string, @Res() response: Response) {
		try {
			const thumbnailPath = Array.isArray(path) ? path.join("/") : path;

			// セキュリティ: パストラバーサル攻撃を防ぐ
			if (thumbnailPath.includes("..") || thumbnailPath.includes("~")) {
				throw new BadRequestException({
					error: "Invalid path",
				});
			}

			// サムネイルファイルの絶対パス（バックエンド専用ディレクトリ）
			const fullThumbnailPath = join(
				process.cwd(),
				"data",
				"thumbnails",
				thumbnailPath,
			);

			// ファイル存在チェック
			if (!existsSync(fullThumbnailPath)) {
				throw new BadRequestException({
					error: "Thumbnail not found",
				});
			}

			// WebPファイルかチェック
			if (!fullThumbnailPath.toLowerCase().endsWith(".webp")) {
				throw new BadRequestException({
					error: "Only WebP thumbnails are supported",
				});
			}

			// ファイル読み取り
			const fileBuffer = await readFile(fullThumbnailPath);

			// WebP画像として配信
			response.status(200);
			response.set({
				"Content-Type": "image/webp",
				"Cache-Control": "public, max-age=86400, immutable", // 24時間キャッシュ
				"Content-Length": fileBuffer.length.toString(),
				Vary: "Origin, Cookie",
			});

			return response.send(new Uint8Array(fileBuffer));
		} catch (error) {
			console.error("Thumbnail serving error:", error);

			throw new BadRequestException({
				error: "Failed to serve thumbnail",
				details: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
