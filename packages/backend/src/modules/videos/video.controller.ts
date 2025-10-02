import {
	Controller,
	Get,
	Query,
	Res,
	BadRequestException,
	NotFoundException,
	Logger,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { promises as fs } from 'node:fs';

interface FileValidation {
	isValid: boolean;
	fullPath: string;
	exists: boolean;
	error?: string;
}

@ApiTags('videos')
@Controller('getVideo')
export class VideoController {
	private readonly logger = new Logger(VideoController.name);

	@Get()
	@ApiQuery({ name: 'filePath', required: true, description: '動画ファイルパス' })
	@ApiResponse({ status: 200, description: '動画ファイル配信' })
	@ApiResponse({ status: 400, description: '無効なファイルパス' })
	@ApiResponse({ status: 403, description: 'アクセス拒否' })
	@ApiResponse({ status: 404, description: 'ファイルが見つからない' })
	@ApiResponse({ status: 500, description: 'サーバーエラー' })
	async getVideo(@Query('filePath') filePath: string, @Res() response: Response) {
		try {
			if (!filePath) {
				throw new BadRequestException('File path is required');
			}

			// セキュアなファイルパス検証（複数ディレクトリ対応）
			const validation = await this.findFileInVideoDirectories(filePath);
			if (!validation.isValid) {
				this.logger.error('Invalid file path:', validation.error);

				const statusCode = validation.error === 'No video directories configured' ? 500 : 403;
				response.status(statusCode);
				return response.send(validation.error || 'Invalid file path');
			}

			// ファイルが存在するか確認
			if (!validation.exists) {
				response.status(404);
				return response.send('File not found');
			}

			// ファイルをストリームとして返す
			if (!validation.fullPath) {
				throw new BadRequestException('File path validation failed');
			}
			const stat = statSync(validation.fullPath);

			// Range requestsのサポート（動画の途中再生など）
			const range = response.req.headers.range;

			if (range) {
				const parts = range.replace(/bytes=/, '').split('-');
				const start = Number.parseInt(parts[0], 10);
				const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
				const chunksize = end - start + 1;

				const stream = createReadStream(validation.fullPath, { start, end });

				response.status(206);
				response.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
				response.setHeader('Accept-Ranges', 'bytes');
				response.setHeader('Content-Length', chunksize.toString());
				response.setHeader('Content-Type', 'video/mp4');

				return stream.pipe(response);
			}

			const fileStream = createReadStream(validation.fullPath);
			response.status(200);
			response.setHeader('Content-Type', 'video/mp4');
			response.setHeader('Content-Length', stat.size.toString());
			response.setHeader('Accept-Ranges', 'bytes');

			return fileStream.pipe(response);
		} catch (error) {
			this.logger.error('Error serving video file:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error;
			}
			response.status(500);
			return response.send('Internal server error');
		}
	}

	private async findFileInVideoDirectories(filePath: string): Promise<FileValidation> {
		const videoDirectories = this.getVideoDirectories();

		if (videoDirectories.length === 0) {
			return {
				isValid: false,
				fullPath: "",
				exists: false,
				error: "No video directories configured",
			};
		}

		// 各ディレクトリでファイルを検索
		for (const videoDirectory of videoDirectories) {
			// セキュリティチェック: パストラバーサル攻撃を防ぐ
			const fullPath = this.sanitizePath(filePath, videoDirectory);

			if (!fullPath) {
				continue; // 無効なパスはスキップ
			}

			// ファイルの存在確認
			const exists = await this.fileExists(fullPath);

			if (exists) {
				return {
					isValid: true,
					fullPath,
					exists: true,
				};
			}
		}

		return {
			isValid: false,
			fullPath: "",
			exists: false,
			error: "File not found in any configured video directory",
		};
	}

	/**
	 * 環境変数からビデオディレクトリのリストを取得
	 */
	private getVideoDirectories(): string[] {
		const videoDirectories = process.env.VIDEO_DIRECTORY || "";

		if (!videoDirectories) {
			return [];
		}

		// カンマ区切りで分割し、空白をトリム
		// 引用符も削除する（Windowsパス対応）
		return videoDirectories
			.split(",")
			.map((dir) => dir.trim().replace(/^["']|["']$/g, "")) // 先頭と末尾の引用符を削除
			.filter((dir) => dir.length > 0);
	}

	/**
	 * 相対パスを安全に処理（ディレクトリトラバーサル攻撃防止）
	 */
	private sanitizePath(userPath: string, basePath: string): string | null {
		const resolvedPath = resolve(basePath, userPath);
		const normalizedBasePath = resolve(basePath);

		// ベースパス外へのアクセスを防ぐ
		if (!resolvedPath.startsWith(normalizedBasePath)) {
			return null;
		}

		return resolvedPath;
	}

	/**
	 * ファイルの存在確認
	 */
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			const stats = await fs.stat(filePath);
			return stats.isFile();
		} catch {
			return false;
		}
	}
}