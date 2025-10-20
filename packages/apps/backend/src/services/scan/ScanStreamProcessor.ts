import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parseVideoFileName } from "../../utils/videoFileNameParser";
import type { ScanSettings } from "../../types/scanSettings";
import { SCAN } from "../../utils/constants";
import { FFprobeMetadataExtractor } from "../../services/FFprobeMetadataExtractor";
import { ThumbnailGenerator } from "../../services/ThumbnailGenerator";
import type { ScanProgressEvent } from "../../common/sse/sse-connection.store";
import { sseStore } from "../../common/sse/sse-connection.store";
import * as crypto from "node:crypto";

export interface ProcessedVideoRecord {
	id: string;
	filePath: string;
	fileName: string;
	title: string;
	fileSize: number;
	episode: number | null;
	year: number | null;
	duration: number | null;
	thumbnailPath: string | null;
	lastModified: Date;
	videoId: string; // SHA-256ハッシュID (32文字)
}

export interface VideoFile {
	filePath: string;
	fileName: string;
}

/**
 * ストリーム処理による大量ファイル処理クラス
 * メモリ使用量を最小化しながら大量のファイルを効率的に処理
 */
export class ScanStreamProcessor {
	private ffprobeExtractor: FFprobeMetadataExtractor;
	private thumbnailGenerator: ThumbnailGenerator;

	constructor(
		private settings: ScanSettings,
		private checkScanControl: (scanId: string) => Promise<void>,
		private getMemoryUsage: () => {
			used: number;
			total: number;
			usagePercent: number;
		},
		private calculateProgressMetrics: (
			processed: number,
			total: number,
		) => {
			processingSpeed: number;
			estimatedTimeRemaining: number;
			totalElapsedTime: number;
			currentPhaseElapsed: number;
		},
		private phaseStartTime: number | null,
		private extractEpisode: (fileName: string) => number | undefined,
	) {
		this.ffprobeExtractor = new FFprobeMetadataExtractor();
		this.thumbnailGenerator = new ThumbnailGenerator("./data/thumbnails");
	}

	/**
	 * ストリーム処理による大量ファイル処理
	 */
	async processFiles(
		allVideoFiles: VideoFile[],
		scanId: string,
	): Promise<ProcessedVideoRecord[]> {
		const results: ProcessedVideoRecord[] = [];
		let processedCount = 0;

		// ファイル配列をストリームソースに変換
		const fileStream = Readable.from(allVideoFiles);

		// メタデータ処理変換ストリーム
		const self = this;
		const metadataTransform = new Transform({
			objectMode: true,
			highWaterMark: this.settings.batchSize,
			async transform(videoFile: VideoFile, encoding, callback) {
				// encoding parameter required by Transform interface but unused
				void encoding;
				try {
					// 制御状態をチェック（一時停止・キャンセル）
					await self.checkScanControl(scanId);

					// FFprobeでメタデータを抽出
					const metadata = await self.ffprobeExtractor.extractMetadata(
						videoFile.filePath,
					);

					// サムネイル生成（既に取得したメタデータを使用）
					let thumbnailPath: string | null = null;
					try {
						const thumbnailResult =
							await self.thumbnailGenerator.generateThumbnail(
								videoFile.filePath,
								metadata, // 既に取得済みのメタデータを渡す
								{}, // options
							);
						if (thumbnailResult.success) {
							thumbnailPath = thumbnailResult.relativePath; // API配信用の相対パスをDB保存
						}
					} catch (error) {
						console.warn(`サムネイル生成失敗 ${videoFile.filePath}:`, error);
					}

					// 既存のパーサーを使用してタイトル情報抽出
					const parsedInfo = parseVideoFileName(videoFile.fileName);

					// DBレコードとして準備
					const videoId = crypto
						.createHash("sha256")
						.update(videoFile.filePath)
						.digest("hex");
					const record: ProcessedVideoRecord = {
						id: videoFile.filePath,
						filePath: videoFile.filePath,
						fileName: videoFile.fileName,
						title: parsedInfo.cleanTitle,
						fileSize: metadata.fileSize,
						episode: self.extractEpisode(videoFile.fileName) ?? null,
						year: parsedInfo.broadcastDate?.getFullYear() ?? null,
						duration: metadata.duration,
						thumbnailPath,
						lastModified: metadata.lastModified,
						videoId, // SHA-256ハッシュID (32文字)
					};

					processedCount++;

					// プログレス更新（設定された間隔で）
					if (processedCount % self.settings.progressUpdateInterval === 0) {
						console.log(
							`🌊 Stream processing: ${processedCount}/${allVideoFiles.length} processed`,
						);

						// メモリ使用量をチェック
						const memUsage = self.getMemoryUsage();
						if (memUsage.used > self.settings.memoryThresholdMB) {
							console.warn(
								`⚠️ Memory threshold exceeded: ${memUsage.used}MB > ${self.settings.memoryThresholdMB}MB`,
							);

							// メモリプレッシャー時の処理調整
							await new Promise((resolve) =>
								setTimeout(resolve, self.settings.sleepInterval * 2),
							);
						}

						// 進捗イベント送信
						const progressMetrics = self.calculateProgressMetrics(
							processedCount,
							allVideoFiles.length,
						);

						const progressEvent: ScanProgressEvent = {
							type: "progress",
							scanId,
							phase: "metadata",
							progress: (processedCount / allVideoFiles.length) * 50, // メタデータ処理は50%まで
							processedFiles: processedCount,
							totalFiles: allVideoFiles.length,
							currentFile: videoFile.fileName,
							message: `ストリーム処理中 (${processedCount}/${allVideoFiles.length}) - Memory: ${memUsage.used}MB`,
							processingSpeed: progressMetrics.processingSpeed,
							estimatedTimeRemaining: progressMetrics.estimatedTimeRemaining,
							phaseStartTime: self.phaseStartTime
								? new Date(self.phaseStartTime).toISOString()
								: undefined,
							totalElapsedTime: progressMetrics.totalElapsedTime,
							currentPhaseElapsed: progressMetrics.currentPhaseElapsed,
						};
						sseStore.broadcast(progressEvent);
					}

					callback(null, record);
				} catch (fileError) {
					console.warn(
						`ストリーム処理エラー: ${videoFile.fileName}`,
						fileError,
					);
					callback(fileError as Error);
				}
			},
		});

		// 結果収集ストリーム
		const collectStream = new Transform({
			objectMode: true,
			transform(record: ProcessedVideoRecord, encoding, callback) {
				// encoding parameter required by Transform interface but unused
				void encoding;
				results.push(record);
				callback();
			},
		});

		// ストリームパイプライン実行
		try {
			await pipeline(fileStream, metadataTransform, collectStream);

			console.log(
				`Stream processing completed: ${results.length} files processed`,
			);

			return results;
		} catch (error) {
			console.error("ストリーム処理エラー:", error);
			throw error;
		}
	}

	/**
	 * 大量ファイル処理でストリーム処理を使用すべきかどうかを判定
	 */
	static shouldUseStreamProcessing(fileCount: number): boolean {
		return fileCount >= SCAN.STREAM_PROCESSING_THRESHOLD;
	}
}
