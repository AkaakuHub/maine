import {
	Controller,
	Get,
	Param,
	Res,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

@ApiTags('media')
@Controller('thumbnails')
export class ThumbnailsController {
	@Get(':path(*)')
	@ApiResponse({ status: 200, description: 'サムネイル画像配信' })
	@ApiResponse({ status: 400, description: '無効なパス' })
	@ApiResponse({ status: 404, description: 'サムネイルが見つからない' })
	async getThumbnail(@Param('path') path: string, @Res({ passthrough: true }) response: Response) {
		try {
			const thumbnailPath = Array.isArray(path) ? path.join('/') : path;

			// セキュリティ: パストラバーサル攻撃を防ぐ
			if (thumbnailPath.includes('..') || thumbnailPath.includes('~')) {
				response.status(400);
				return { error: "Invalid path" };
			}

			// サムネイルファイルの絶対パス（バックエンド専用ディレクトリ）
			const fullThumbnailPath = join(
				process.cwd(),
				'data',
				'thumbnails',
				thumbnailPath,
			);

			// ファイル存在チェック
			if (!existsSync(fullThumbnailPath)) {
				response.status(404);
				return { error: "Thumbnail not found" };
			}

			// WebPファイルかチェック
			if (!fullThumbnailPath.toLowerCase().endsWith('.webp')) {
				response.status(400);
				return { error: "Only WebP thumbnails are supported" };
			}

			// ファイル読み取り
			const fileBuffer = await readFile(fullThumbnailPath);

			// WebP画像として配信
			response.setHeader('Content-Type', 'image/webp');
			response.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // 24時間キャッシュ
			response.setHeader('Content-Length', fileBuffer.length.toString());

			return new Response(new Uint8Array(fileBuffer), {
				status: 200,
				headers: {
					"Content-Type": "image/webp",
					"Cache-Control": "public, max-age=86400, immutable", // 24時間キャッシュ
					"Content-Length": fileBuffer.length.toString(),
				},
			});
		} catch (error) {
			console.error("Thumbnail serving error:", error);

			response.status(500);
			return {
				error: "Failed to serve thumbnail",
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}
}