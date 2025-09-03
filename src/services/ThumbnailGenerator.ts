import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { existsSync } from "node:fs";
import { FFPROBE } from "@/utils/constants";

const execAsync = promisify(exec);

export interface ThumbnailOptions {
	seekTime?: number; // シーク時間（秒）デフォルト: 20秒
	quality?: number; // WebP品質（0-100）デフォルト: 70
	width?: number; // サムネイル幅（ピクセル）デフォルト: 300px（height自動調整）
}

export interface ThumbnailResult {
	success: boolean;
	thumbnailPath: string | null;
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
		options: ThumbnailOptions = {},
	): Promise<ThumbnailResult> {
		try {
			const {
				seekTime = FFPROBE.DEFAULT_SEEK_TIME,
				quality = FFPROBE.DEFAULT_THUMBNAIL_QUALITY,
				width = FFPROBE.DEFAULT_THUMBNAIL_WIDTH,
			} = options;

			// サムネイルファイルパスを生成
			const thumbnailPath = this.generateThumbnailPath(videoFilePath);

			// 既にサムネイルが存在する場合はスキップ
			if (existsSync(thumbnailPath)) {
				const stat = await import("node:fs/promises").then((fs) =>
					fs.stat(thumbnailPath),
				);
				return {
					success: true,
					thumbnailPath,
					fileSize: stat.size,
				};
			}

			// サムネイル保存ディレクトリを作成
			await this.ensureThumbnailDirectory(thumbnailPath);

			// 計画書の最適コマンド: シーク+キーフレーム手法でWebP生成
			const command = [
				"ffmpeg",
				"-y", // 上書き許可
				`-ss ${this.formatSeekTime(seekTime)}`, // シーク時間
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
				fileSize: stat.size,
			};
		} catch (error) {
			console.error(`Thumbnail generation failed for: ${videoFilePath}`, error);

			return {
				success: false,
				thumbnailPath: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * 複数ファイルのサムネイルを並列生成
	 */
	async generateBatchThumbnails(
		videoFilePaths: string[],
		concurrency = FFPROBE.DEFAULT_THUMBNAIL_CONCURRENCY,
		options: ThumbnailOptions = {},
	): Promise<ThumbnailResult[]> {
		const results: ThumbnailResult[] = [];

		// 並列処理でconcurrency数ずつ処理
		for (let i = 0; i < videoFilePaths.length; i += concurrency) {
			const batch = videoFilePaths.slice(i, i + concurrency);

			const batchPromises = batch.map((filePath) =>
				this.generateThumbnail(filePath, options),
			);

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);
		}

		const successCount = results.filter((r) => r.success).length;
		console.log(
			`🖼️ Thumbnail generation completed: ${successCount}/${videoFilePaths.length} successful`,
		);

		return results;
	}

	/**
	 * サムネイルファイルパスを生成
	 */
	private generateThumbnailPath(videoFilePath: string): string {
		const fileName = basename(videoFilePath);
		const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
		const thumbnailFileName = `${nameWithoutExt}.webp`;

		return join(this.thumbnailBaseDir, thumbnailFileName);
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
	async thumbnailExists(videoFilePath: string): Promise<boolean> {
		const thumbnailPath = this.generateThumbnailPath(videoFilePath);
		return existsSync(thumbnailPath);
	}

	/**
	 * サムネイルファイルパスを取得（存在チェックなし）
	 */
	getThumbnailPath(videoFilePath: string): string {
		return this.generateThumbnailPath(videoFilePath);
	}
}
