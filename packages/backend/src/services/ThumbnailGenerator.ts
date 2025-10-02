import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { FFPROBE } from "@/utils/constants";
import type { VideoMetadata } from "./FFprobeMetadataExtractor";

const execAsync = promisify(exec);

export interface ThumbnailOptions {
	seekTime?: number; // 自動計算（33%地点）を使用
	quality?: number; // WebP品質（0-100）デフォルト: 70
	width?: number; // サムネイル幅（ピクセル）デフォルト: 300px（height自動調整）
}

export interface ThumbnailResult {
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
		existingMetadata: VideoMetadata,
		options: ThumbnailOptions = {},
	): Promise<ThumbnailResult> {
		try {
			const {
				quality = FFPROBE.DEFAULT_THUMBNAIL_QUALITY,
				width = FFPROBE.DEFAULT_THUMBNAIL_WIDTH,
			} = options;

			// サムネイルファイルパスを生成
			const thumbnailPath = this.generateThumbnailPath(videoFilePath);

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
						relativePath: this.getThumbnailRelativePath(videoFilePath),
						fileSize: thumbnailStat.size,
					};
				}

				// サムネイルが古い場合は再生成（下に続く）
				console.log(
					`サムネイル更新: ${videoFilePath} (ビデオファイルが更新されました)`,
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
				relativePath: this.getThumbnailRelativePath(videoFilePath),
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
	/**
	 * サムネイルファイルパスを生成（ハッシュベース）
	 */
	private generateThumbnailPath(videoFilePath: string): string {
		// ファイルパスのハッシュを生成（特殊文字対応）
		const hash = createHash("sha256").update(videoFilePath).digest("hex");
		const thumbnailFileName = `${hash}.webp`;

		return join(this.thumbnailBaseDir, thumbnailFileName);
	}

	/**
	 * サムネイルの相対パス（API配信用）を取得
	 */
	getThumbnailRelativePath(videoFilePath: string): string {
		const hash = createHash("sha256").update(videoFilePath).digest("hex");
		return `${hash}.webp`;
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
