import {
	Controller,
	Get,
	Param,
	Res,
	Query,
	NotFoundException,
	BadRequestException,
	Logger,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { statSync, createReadStream } from 'node:fs';
import { join } from 'node:path';

interface FileValidation {
	isValid: boolean;
	exists: boolean;
	fullPath?: string;
	error?: string;
}

@ApiTags('videos')
@Controller('video')
export class VideoDetailController {
	private readonly logger = new Logger(VideoDetailController.name);

	@Get(':filePath')
	@ApiQuery({ name: 'download', required: false, description: 'ダウンロードモード' })
	@ApiResponse({ status: 200, description: '動画ファイル配信' })
	@ApiResponse({ status: 400, description: '無効なリクエスト' })
	@ApiResponse({ status: 404, description: 'ファイルが見つからない' })
	async getVideo(
		@Param('filePath') filePath: string,
		@Query('download') download?: string,
		@Res() response?: Response,
	) {
		try {
			const decodedPath = decodeURIComponent(filePath);
			const isDownload = download === 'true';

			// 複数のビデオディレクトリからファイルを検索
			const fileValidation = await this.findFileInVideoDirectories(decodedPath);

			if (!fileValidation.isValid || !fileValidation.exists) {
				throw new NotFoundException('Video file not found');
			}

			if (!fileValidation.fullPath) {
				throw new BadRequestException('Invalid file path validation');
			}

			const stat = statSync(fileValidation.fullPath);

			// Range requestsのサポート
			const range = response?.req.headers.range;

			if (range) {
				const parts = range.replace(/bytes=/, '').split('-');
				const start = Number.parseInt(parts[0], 10);
				const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
				const chunksize = end - start + 1;

				const stream = createReadStream(fileValidation.fullPath, { start, end });

				if (response) {
					response.status(206);
					response.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
					response.setHeader('Accept-Ranges', 'bytes');
					response.setHeader('Content-Length', chunksize.toString());
					response.setHeader('Content-Type', 'video/mp4');
					if (isDownload) {
						response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filePath)}"`);
					}
				}

				return stream;
			}

			const fileStream = createReadStream(fileValidation.fullPath);

			if (response) {
				response.status(200);
				response.setHeader('Content-Type', 'video/mp4');
				response.setHeader('Content-Length', stat.size.toString());
				response.setHeader('Accept-Ranges', 'bytes');
				if (isDownload) {
					response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filePath)}"`);
				}
			}

			return fileStream;
		} catch (error) {
			this.logger.error('Error serving video file:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException('Failed to serve video file');
		}
	}

	private async findFileInVideoDirectories(filePath: string): Promise<FileValidation> {
		try {
			// セキュリティ: パストラバーサル攻撃を防ぐ
			if (filePath.includes('..') || filePath.includes('~')) {
				return {
					isValid: false,
					exists: false,
					error: 'Invalid file path',
				};
			}

			// 環境変数から動画ディレクトリを取得
			const videoDirectories = process.env.VIDEO_DIRECTORIES?.split(',') || ['/Users/akaaku/Movies/yt-dlp-data'];

			if (videoDirectories.length === 0) {
				return {
					isValid: false,
					exists: false,
					error: 'No video directories configured',
				};
			}

			// 各ディレクトリでファイルを検索
			for (const baseDir of videoDirectories) {
				const fullPath = join(baseDir, filePath);

				try {
					const fs = require('node:fs');
					await fs.promises.access(fullPath);

					return {
						isValid: true,
						exists: true,
						fullPath,
					};
				} catch {
					// ファイルが存在しない場合は次のディレクトリを検索
				}
			}

			return {
				isValid: true,
				exists: false,
				error: 'File not found in any video directory',
			};
		} catch (error) {
			this.logger.error('Error validating file path:', error);
			return {
				isValid: false,
				exists: false,
				error: 'Error validating file path',
			};
		}
	}
}