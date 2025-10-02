import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { Injectable, Logger } from "@nestjs/common";

const execAsync = promisify(exec);

export interface ThumbnailOptions {
	seekTime?: number;
	quality?: number;
	width?: number;
}

export interface ThumbnailResult {
	success: boolean;
	thumbnailPath: string | null;
	relativePath: string | null;
	fileSize?: number;
	error?: string;
}

export interface VideoMetadata {
	filePath: string;
	fileName: string;
	fileSize: number;
	duration: number | null;
	lastModified: Date;
}

interface FFProbeFormat {
	size?: string;
	duration?: string;
}

interface FFProbeOutput {
	format?: FFProbeFormat;
}

@Injectable()
export class ThumbnailGeneratorService {
	private readonly logger = new Logger(ThumbnailGeneratorService.name);
	private readonly thumbnailBaseDir: string;

	constructor() {
		this.thumbnailBaseDir = "./data/thumbnails";
	}

	async generateThumbnail(
		videoFilePath: string,
		existingMetadata: VideoMetadata,
		options: ThumbnailOptions = {},
	): Promise<ThumbnailResult> {
		try {
			const { quality = 70, width = 300 } = options;

			const thumbnailPath = this.generateThumbnailPath(videoFilePath);

			if (existsSync(thumbnailPath)) {
				const [thumbnailStat, videoStat] = await Promise.all([
					this.stat(thumbnailPath),
					this.stat(videoFilePath),
				]);

				if (thumbnailStat.mtime >= videoStat.mtime) {
					return {
						success: true,
						thumbnailPath,
						relativePath: this.getThumbnailRelativePath(videoFilePath),
						fileSize: thumbnailStat.size,
					};
				}

				this.logger.log(
					`Thumbnail update: ${videoFilePath} (video file updated)`,
				);
			}

			await this.ensureThumbnailDirectory(thumbnailPath);

			const duration = existingMetadata.duration || 1;
			const thumbnailPosition = Math.max(1, duration * 0.33);

			const command = [
				"ffmpeg",
				"-y",
				`-ss ${this.formatSeekTime(thumbnailPosition)}`,
				`-i "${videoFilePath}"`,
				`-vf "thumbnail=${width}"`,
				"-frames:v 1",
				"-f webp",
				`-quality ${quality}`,
				`"${thumbnailPath}"`,
			].join(" ");

			await execAsync(command);

			const stat = await this.stat(thumbnailPath);

			return {
				success: true,
				thumbnailPath,
				relativePath: this.getThumbnailRelativePath(videoFilePath),
				fileSize: stat.size,
			};
		} catch (error) {
			this.logger.error(
				`Thumbnail generation failed for: ${videoFilePath}`,
				error,
			);

			return {
				success: false,
				thumbnailPath: null,
				relativePath: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private generateThumbnailPath(videoFilePath: string): string {
		const hash = createHash("sha256").update(videoFilePath).digest("hex");
		const thumbnailFileName = `${hash}.webp`;

		return join(this.thumbnailBaseDir, thumbnailFileName);
	}

	getThumbnailRelativePath(videoFilePath: string): string {
		const hash = createHash("sha256").update(videoFilePath).digest("hex");
		return `${hash}.webp`;
	}

	private formatSeekTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
	}

	private async ensureThumbnailDirectory(thumbnailPath: string): Promise<void> {
		const dir = dirname(thumbnailPath);

		try {
			await mkdir(dir, { recursive: true });
		} catch (error) {
			this.logger.error(`Failed to create thumbnail directory: ${dir}`, error);
			throw error;
		}
	}

	static async isFFmpegAvailable(): Promise<boolean> {
		try {
			await execAsync("ffmpeg -version");
			return true;
		} catch {
			return false;
		}
	}

	async thumbnailExists(videoFilePath: string): Promise<boolean> {
		const thumbnailPath = this.generateThumbnailPath(videoFilePath);
		return existsSync(thumbnailPath);
	}

	getThumbnailPath(videoFilePath: string): string {
		return this.generateThumbnailPath(videoFilePath);
	}

	private async stat(path: string): Promise<{ size: number; mtime: Date }> {
		const fs = await import("node:fs/promises");
		const stat = await fs.stat(path);
		return {
			size: stat.size,
			mtime: stat.mtime,
		};
	}
}

@Injectable()
export class FFprobeMetadataExtractorService {
	private readonly logger = new Logger(FFprobeMetadataExtractorService.name);

	async extractMetadata(filePath: string): Promise<VideoMetadata> {
		try {
			const [fileStat, ffprobeResult] = await Promise.all([
				this.stat(filePath),
				this.extractFFprobeMetadata(filePath),
			]);

			const fileName = filePath.split("/").pop() || filePath;

			return {
				filePath,
				fileName,
				fileSize: fileStat.size,
				duration: ffprobeResult.duration,
				lastModified: fileStat.mtime,
			};
		} catch (error) {
			this.logger.warn(
				`FFprobe metadata extraction failed for: ${filePath}`,
				error,
			);

			try {
				const fileStat = await this.stat(filePath);
				const fileName = filePath.split("/").pop() || filePath;

				return {
					filePath,
					fileName,
					fileSize: fileStat.size,
					duration: null,
					lastModified: fileStat.mtime,
				};
			} catch (fallbackError) {
				this.logger.error(
					`File stat fallback failed for: ${filePath}`,
					fallbackError,
				);
				throw fallbackError;
			}
		}
	}

	async extractBatchMetadata(
		filePaths: string[],
		concurrency = 4,
	): Promise<VideoMetadata[]> {
		const results: VideoMetadata[] = [];
		const errors: Array<{ filePath: string; error: unknown }> = [];

		for (let i = 0; i < filePaths.length; i += concurrency) {
			const batch = filePaths.slice(i, i + concurrency);

			const batchPromises = batch.map(async (filePath) => {
				try {
					return await this.extractMetadata(filePath);
				} catch (error) {
					errors.push({ filePath, error });
					return null;
				}
			});

			const batchResults = await Promise.all(batchPromises);

			for (const result of batchResults) {
				if (result !== null) {
					results.push(result);
				}
			}
		}

		if (errors.length > 0) {
			this.logger.warn(
				`FFprobe batch extraction had ${errors.length} errors out of ${filePaths.length} files`,
			);
		}

		return results;
	}

	private async extractFFprobeMetadata(filePath: string): Promise<{
		duration: number | null;
	}> {
		try {
			const command = `ffprobe -v quiet -print_format json -show_entries format=size,duration "${filePath}"`;
			const { stdout } = await execAsync(command);

			if (!stdout.trim()) {
				return { duration: null };
			}

			const ffprobeData: FFProbeOutput = JSON.parse(stdout);

			let duration: number | null = null;
			if (ffprobeData.format?.duration) {
				const durationFloat = Number.parseFloat(ffprobeData.format.duration);
				if (!Number.isNaN(durationFloat) && durationFloat > 0) {
					duration = Math.round(durationFloat);
				}
			}

			return { duration };
		} catch (error) {
			this.logger.warn(`FFprobe command failed for: ${filePath}`, error);
			return { duration: null };
		}
	}

	static async isFFprobeAvailable(): Promise<boolean> {
		try {
			await execAsync("ffprobe -version");
			return true;
		} catch {
			return false;
		}
	}

	private async stat(path: string): Promise<{ size: number; mtime: Date }> {
		const fs = await import("node:fs/promises");
		const stat = await fs.stat(path);
		return {
			size: stat.size,
			mtime: stat.mtime,
		};
	}
}
