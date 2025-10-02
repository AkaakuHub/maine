import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { Injectable, Logger } from "@nestjs/common";

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
	 * 複数のビデオディレクトリから指定されたファイルパスを検索
	 */
	async validateFileExists(filePath: string): Promise<FilePathValidation> {
		try {
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
		} catch (error) {
			this.logger.error("Error validating file:", error);
			return {
				isValid: false,
				fullPath: "",
				exists: false,
				error: "Error validating file path",
			};
		}
	}

	/**
	 * 動画ディレクトリ設定を取得
	 */
	private getVideoDirectories(): string[] {
		const videoDirectories = process.env.VIDEO_DIRECTORIES || "";

		if (!videoDirectories) {
			return [];
		}

		// カンマ区切りで分割し、空白をトリム
		// 引用符も削除する（Windowsパス対応）
		return videoDirectories
			.split(",")
			.map((dir) => dir.trim().replace(/^["']|["']$/g, ""))
			.filter((dir) => dir.length > 0);
	}

	/**
	 * パスのセキュリティチェック
	 */
	private sanitizePath(userPath: string, basePath: string): string | null {
		const resolvedPath = path.resolve(basePath, userPath);
		const normalizedBasePath = path.resolve(basePath);

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
