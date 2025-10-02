import { exec } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";

const execAsync = promisify(exec);

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

/**
 * FFprobeを使用した効率的なビデオメタデータ抽出クラス
 * 計画書で定義された最適コマンドを使用
 */
export class FFprobeMetadataExtractor {
	/**
	 * 単一ビデオファイルのメタデータを抽出
	 */
	async extractMetadata(filePath: string): Promise<VideoMetadata> {
		try {
			// 並列でファイル統計とffprobeを実行
			const [fileStat, ffprobeResult] = await Promise.all([
				stat(filePath),
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
			console.warn(
				`FFprobe metadata extraction failed for: ${filePath}`,
				error,
			);

			// フォールバック: ファイル統計のみ取得
			try {
				const fileStat = await stat(filePath);
				const fileName = filePath.split("/").pop() || filePath;

				return {
					filePath,
					fileName,
					fileSize: fileStat.size,
					duration: null,
					lastModified: fileStat.mtime,
				};
			} catch (fallbackError) {
				console.error(
					`File stat fallback failed for: ${filePath}`,
					fallbackError,
				);
				throw fallbackError;
			}
		}
	}

	/**
	 * 複数ファイルのメタデータを並列抽出
	 */
	async extractBatchMetadata(
		filePaths: string[],
		concurrency = 4,
	): Promise<VideoMetadata[]> {
		const results: VideoMetadata[] = [];
		const errors: Array<{ filePath: string; error: unknown }> = [];

		// 並列処理でconcurrency数ずつ処理
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

			// null以外の結果を追加
			for (const result of batchResults) {
				if (result !== null) {
					results.push(result);
				}
			}
		}

		if (errors.length > 0) {
			console.warn(
				`FFprobe batch extraction had ${errors.length} errors out of ${filePaths.length} files`,
			);
		}

		return results;
	}

	/**
	 * FFprobeコマンドを実行してメタデータを取得
	 * 計画書で定義された最適コマンドを使用
	 */
	private async extractFFprobeMetadata(filePath: string): Promise<{
		duration: number | null;
	}> {
		try {
			// 計画書の最適コマンド: ffprobe -v quiet -print_format json -show_entries format=size,duration
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
					duration = Math.round(durationFloat); // 秒単位で整数に丸める
				}
			}

			return { duration };
		} catch (error) {
			console.warn(`FFprobe command failed for: ${filePath}`, error);
			return { duration: null };
		}
	}

	/**
	 * FFprobeが利用可能かチェック
	 */
	static async isFFprobeAvailable(): Promise<boolean> {
		try {
			await execAsync("ffprobe -version");
			return true;
		} catch {
			return false;
		}
	}
}
