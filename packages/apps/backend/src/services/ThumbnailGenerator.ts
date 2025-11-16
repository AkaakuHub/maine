import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, copyFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { FFPROBE } from "../utils/constants";
import type { VideoMetadata } from "./FFprobeMetadataExtractor";

const execAsync = promisify(exec);

interface ThumbnailOptions {
	seekTime?: number; // 自動計算（33%地点）を使用
	quality?: number; // WebP品質（0-100）デフォルト: 70
	width?: number; // サムネイル幅（ピクセル）デフォルト: 300px（height自動調整）
}

interface ThumbnailResult {
	success: boolean;
	thumbnailPath: string | null; // ローカルファイルパス
	relativePath: string | null; // API配信用の相対パス
	fileSize?: number; // 生成されたサムネイルのファイルサイズ（バイト）
	error?: string;
}

/**
 * 動画ファイルのサムネイル生成クラス
 * 計画書で定義されたシーク+キーフレーム手法とWebP形式を使用
 */
export class ThumbnailGenerator {
	/**
	 * サムネイル保存ディレクトリの基準パス
	 */
	private readonly thumbnailBaseDir: string;

	constructor(thumbnailBaseDir = "./thumbnails") {
		this.thumbnailBaseDir = thumbnailBaseDir;
	}

	/**
	 * 単一動画ファイルのサムネイルを生成
	 */
	async generateThumbnail(
		videoFilePath: string,
		videoId: string,
		existingMetadata: VideoMetadata,
		options: ThumbnailOptions = {},
	): Promise<ThumbnailResult> {
		try {
			const {
				quality = FFPROBE.DEFAULT_THUMBNAIL_QUALITY,
				width = FFPROBE.DEFAULT_THUMBNAIL_WIDTH,
			} = options;

			// videoIdベースのサムネイルパスを生成
			const thumbnailPath = this.getThumbnailFullPath(videoId);

			// 既にサムネイルが存在する場合、ビデオファイルとの更新時刻を比較
			if (existsSync(thumbnailPath)) {
				const [thumbnailStat, videoStat] = await Promise.all([
					import("node:fs/promises").then((fs) => fs.stat(thumbnailPath)),
					import("node:fs/promises").then((fs) => fs.stat(videoFilePath)),
				]);

				// サムネイルがビデオファイルより新しい場合はスキップ
				if (thumbnailStat.mtime >= videoStat.mtime) {
					return {
						success: true,
						thumbnailPath,
						relativePath: this.getThumbnailRelativePathByVideoId(videoId),
						fileSize: thumbnailStat.size,
					};
				}
			}

			// 動画と同じ名前の.webpファイルが存在するかチェック
			const existingWebpPath = this.checkExistingWebpFile(videoFilePath);
			if (existingWebpPath) {
				return await this.copyExistingWebp(
					existingWebpPath,
					thumbnailPath,
					videoId,
				);
			}

			// サムネイル保存ディレクトリを作成
			await this.ensureThumbnailDirectory(thumbnailPath);

			// 動画の時間情報を取得して33%地点を計算
			const duration = existingMetadata.duration || 1; // デフォルト1秒
			const thumbnailPosition = Math.max(1, duration * 0.33);

			// 計画書の最適コマンド: シーク+キーフレーム手法でWebP生成
			const command = [
				"ffmpeg",
				"-y", // 上書き許可
				`-ss ${this.formatSeekTime(thumbnailPosition)}`, // 33%地点のシーク時間
				`-i "${videoFilePath}"`, // 入力ファイル
				`-vf "thumbnail=${width}"`, // キーフレーム選択とリサイズ
				"-frames:v 1", // 1フレームのみ
				"-f webp", // WebP形式
				`-quality ${quality}`, // 品質設定
				`"${thumbnailPath}"`, // 出力パス
			].join(" ");

			await execAsync(command);

			// 生成されたファイルサイズを取得
			const stat = await import("node:fs/promises").then((fs) =>
				fs.stat(thumbnailPath),
			);

			return {
				success: true,
				thumbnailPath,
				relativePath: this.getThumbnailRelativePathByVideoId(videoId),
				fileSize: stat.size,
			};
		} catch (error) {
			console.error(`Thumbnail generation failed for: ${videoFilePath}`, error);

			return {
				success: false,
				thumbnailPath: null,
				relativePath: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
	private getThumbnailFileName(videoId: string): string {
		return `${videoId}.webp`;
	}

	private getThumbnailFullPath(videoId: string): string {
		return join(this.thumbnailBaseDir, this.getThumbnailFileName(videoId));
	}

	getThumbnailRelativePathByVideoId(videoId: string): string {
		return this.getThumbnailFileName(videoId);
	}

	/**
	 * シーク時間を適切な形式にフォーマット
	 */
	private formatSeekTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
	}

	/**
	 * サムネイル保存ディレクトリを確保
	 */
	private async ensureThumbnailDirectory(thumbnailPath: string): Promise<void> {
		const dir = dirname(thumbnailPath);

		try {
			await mkdir(dir, { recursive: true });
		} catch (error) {
			console.error(`Failed to create thumbnail directory: ${dir}`, error);
			throw error;
		}
	}

	/**
	 * FFmpegが利用可能かチェック
	 */
	static async isFFmpegAvailable(): Promise<boolean> {
		try {
			await execAsync("ffmpeg -version");
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * サムネイルファイルが存在するかチェック
	 */
	async thumbnailExistsByVideoId(videoId: string): Promise<boolean> {
		const thumbnailPath = this.getThumbnailFullPath(videoId);
		return existsSync(thumbnailPath);
	}

	getThumbnailPathByVideoId(videoId: string): string {
		return this.getThumbnailFullPath(videoId);
	}

	async deleteThumbnailByVideoId(videoId: string): Promise<void> {
		const thumbnailPath = this.getThumbnailFullPath(videoId);
		if (!existsSync(thumbnailPath)) {
			return;
		}
		try {
			await unlink(thumbnailPath);
		} catch (error) {
			console.warn(`Failed to delete thumbnail for videoId=${videoId}:`, error);
		}
	}

	/**
	 * 動画と同じ名前の.webpファイルが存在するかチェック
	 */
	private checkExistingWebpFile(videoFilePath: string): string | null {
		const videoBaseName = videoFilePath.replace(/\.[^/.]+$/, ""); // 拡張子を除去
		const webpPath = `${videoBaseName}.webp`;

		if (existsSync(webpPath)) {
			return webpPath;
		}

		return null;
	}

	/**
	 * 既存のwebpファイルをサムネイルとしてコピー
	 */
	private async copyExistingWebp(
		sourcePath: string,
		destinationPath: string,
		videoId: string,
	): Promise<ThumbnailResult> {
		try {
			// サムネイル保存ディレクトリを作成
			await this.ensureThumbnailDirectory(destinationPath);

			// webpファイルをコピー
			await copyFile(sourcePath, destinationPath);

			// コピーしたファイルの情報を取得
			const stat = await import("node:fs/promises").then((fs) =>
				fs.stat(destinationPath),
			);
			console.log(
				`既存webpファイルをコピー: ${sourcePath} -> ${destinationPath}`,
			);

			return {
				success: true,
				thumbnailPath: destinationPath,
				relativePath: this.getThumbnailRelativePathByVideoId(videoId),
				fileSize: stat.size,
			};
		} catch (error) {
			console.error(`webpファイルのコピーに失敗: ${sourcePath}`, error);
			return {
				success: false,
				thumbnailPath: null,
				relativePath: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
