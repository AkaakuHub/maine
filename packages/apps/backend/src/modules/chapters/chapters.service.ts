import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { findFileInVideoDirectories } from "../../libs/fileUtils";

const execAsync = promisify(exec);

interface FilePathValidation {
	isValid: boolean;
	fullPath: string;
	exists: boolean;
	error?: string;
}

export interface VideoChapter {
	id: number;
	title: string;
	startTime: number; // 秒単位
	endTime: number;
	duration: number;
}

interface FFProbeChapter {
	id: number;
	start_time: string;
	end_time: string;
	tags?: {
		title?: string;
	};
}

interface FFProbeOutput {
	chapters?: FFProbeChapter[];
}

@Injectable()
export class ChaptersService {
	private readonly logger = new Logger(ChaptersService.name);

	constructor(private readonly prisma: PrismaService) {}

	/**
	 * 動画ファイルからチャプター情報を抽出
	 */
	async extractVideoChapters(filePath: string): Promise<VideoChapter[]> {
		try {
			this.logger.log(`Extracting chapters for: ${filePath}`);

			// ffprobeでチャプター情報をJSON形式で取得
			const command = `ffprobe -v quiet -print_format json -show_chapters "${filePath}"`;
			const { stdout } = await execAsync(command);

			if (!stdout.trim()) {
				return []; // チャプター情報なし
			}

			const ffprobeData: FFProbeOutput = JSON.parse(stdout);

			if (!ffprobeData.chapters || ffprobeData.chapters.length === 0) {
				return [];
			}

			// FFProbeの結果をVideoChapter形式に変換
			const chapters = ffprobeData.chapters.map((chapter) => {
				const startTime = Number.parseFloat(chapter.start_time);
				const endTime = Number.parseFloat(chapter.end_time);

				return {
					id: chapter.id,
					title: chapter.tags?.title || `Chapter ${chapter.id + 1}`,
					startTime,
					endTime,
					duration: endTime - startTime,
				};
			});

			this.logger.log(`Found ${chapters.length} chapters`);
			return chapters;
		} catch (error) {
			this.logger.error("Failed to extract video chapters:", error);
			return [];
		}
	}

	/**
	 * チャプター情報をWebVTT形式に変換（HTML5 video要素用）
	 */
	convertChaptersToWebVTT(chapters: VideoChapter[]): string {
		if (chapters.length === 0) return "";

		let vtt = "WEBVTT\n\n";

		chapters.forEach((chapter, index) => {
			const startTime = this.formatTimeForWebVTT(chapter.startTime);
			const endTime = this.formatTimeForWebVTT(chapter.endTime);

			vtt += `CHAPTER ${index + 1}\n`;
			vtt += `${startTime} --> ${endTime}\n`;
			vtt += `${chapter.title}\n\n`;
		});

		return vtt;
	}

	/**
	 * 秒数をWebVTT時間形式 (HH:MM:SS.mmm) に変換
	 */
	private formatTimeForWebVTT(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
	}

	/**
	 * videoIdからfilePathを取得
	 */
	async getFilePathByVideoId(videoId: string): Promise<string | null> {
		try {
			const video = await this.prisma.videoMetadata.findUnique({
				where: { videoId },
				select: { filePath: true },
			});

			return video?.filePath || null;
		} catch (error) {
			this.logger.error("Error getting filePath by videoId:", error);
			return null;
		}
	}

	/**
	 * 複数のビデオディレクトリから指定されたファイルパスを検索
	 */
	async validateFileExists(filePath: string): Promise<FilePathValidation> {
		try {
			return await findFileInVideoDirectories(filePath);
		} catch (error) {
			this.logger.error("Error validating file:", error);
			return {
				isValid: false,
				fullPath: "",
				exists: false,
				error: "ファイルパスの検証エラー",
			};
		}
	}
}
