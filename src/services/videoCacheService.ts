import { promises as fs } from "node:fs";
import path from "node:path";
import * as cron from "node-cron";
import { prisma } from "@/libs/prisma";
import {
	normalizePath,
	isVideoFile,
	getVideoDirectories,
	directoryExists,
} from "@/libs/fileUtils";
import type { VideoFileData } from "@/type";
import { parseVideoFileName } from "@/utils/videoFileNameParser";
import { scanEventEmitter } from "@/services/scanEventEmitter";
import type { ScanSettings } from "@/types/scanSettings";
import { DEFAULT_SCAN_SETTINGS } from "@/types/scanSettings";
import { SCAN } from "@/utils/constants";

// 既存のVideoScanServiceから型をimport
// VideoFileInfo型は削除（DBベース移行でメモリキャッシュ不要）

type SearchResult = {
	success: boolean;
	videos: VideoFileData[];
	totalFound: number;
	message: string;
	error?: string;
};

interface CacheStatus {
	isUpdating: boolean;
	progress: number;
	lastScanDate: Date | null;
	daysSinceLastScan: number;
	cacheSize: number;
}

interface UpdateCheckResult {
	isUpdating: boolean;
	needsUpdate: boolean;
	daysSince: number;
}

/**
 * HDDに優しい動画DBキャッシュサービス
 * - 週1回自動フルスキャン（日曜深夜3時）
 * - フロントエンド開いた時の差分チェック（1週間経過時）
 * - DBベースでの超高速検索（メモリ使用量：数KB）
 */
class VideoCacheService {
	// ❌ メモリキャッシュ削除（週2-3回使用には無駄）
	// private fileCache: Map<string, VideoFileInfo> = new Map();

	private lastFullScanTime: Date | null = null;
	private isUpdating = false;
	private updateProgress = 0;
	private cronJob: cron.ScheduledTask | null = null;
	private initialized = false;

	// スキャン制御状態
	private currentScanId: string | null = null;
	private scanControlState: {
		isPaused: boolean;
		isCancelled: boolean;
		shouldStop: boolean;
	} = {
		isPaused: false,
		isCancelled: false,
		shouldStop: false,
	};

	// 詳細プログレス追跡
	private scanStartTime: Date | null = null;
	private phaseStartTime: Date | null = null;
	private lastProgressUpdate: Date | null = null;
	private processedFilesInCurrentWindow = 0;
	private progressWindowStartTime: Date | null = null;

	// スキャン設定
	private scanSettings: ScanSettings = DEFAULT_SCAN_SETTINGS;

	// パフォーマンス監視
	private memoryUsageHistory: number[] = [];
	private lastCPUUsage: { user: number; system: number } = {
		user: 0,
		system: 0,
	};

	constructor() {
		this.initializePromise = this.initialize();

		// スキャン制御イベントリスナーを設定
		this.setupScanControlListeners();
	}

	private initializePromise: Promise<void>;

	/**
	 * サービス初期化
	 */
	private async initialize() {
		try {
			// データベースからスキャン設定を読み込み
			await this.loadScanSettings();

			// 週次自動更新の設定
			this.setupWeeklyUpdate();

			// 初回起動時、DBが空なら構築
			const videoCount = await prisma.videoMetadata.count();
			if (videoCount === 0) {
				console.log("初回起動: DBキャッシュを構築します...");
				await this.buildInitialCache();
			} else {
				console.log(
					`DBキャッシュ初期化完了: ${videoCount}ファイル（メモリ使用: 数KB）`,
				);
			}
		} catch (error) {
			console.error("VideoCacheService初期化エラー:", error);
		} finally {
			this.initialized = true;
		}
	}

	/**
	 * 初期化完了を保証
	 */
	private async ensureInitialized(): Promise<void> {
		await this.initializePromise;
	}

	/**
	 * スキャン制御イベントリスナーを設定
	 */
	private setupScanControlListeners(): void {
		scanEventEmitter.on("scanControl", (controlEvent) => {
			// 現在のスキャンに対する制御のみ処理
			if (controlEvent.scanId !== this.currentScanId) {
				console.log(
					`🎛️ Ignoring control for different scan: ${controlEvent.scanId}`,
				);
				return;
			}

			console.log(
				`🎛️ Scan Control received: ${controlEvent.type} for scan ${controlEvent.scanId}`,
			);

			switch (controlEvent.type) {
				case "pause":
					this.scanControlState.isPaused = true;
					console.log("⏸️ Scan paused");
					break;

				case "resume":
					this.scanControlState.isPaused = false;
					console.log("▶️ Scan resumed");
					break;

				case "cancel":
					this.scanControlState.isCancelled = true;
					this.scanControlState.shouldStop = true;
					console.log("❌ Scan cancelled");
					break;
			}
		});
	}

	/**
	 * スキャン制御状態をチェックし、必要に応じて待機またはエラーを投げる
	 */
	private async checkScanControl(scanId: string): Promise<void> {
		// キャンセルチェック
		if (this.scanControlState.isCancelled || this.scanControlState.shouldStop) {
			throw new Error("Scan was cancelled by user");
		}

		// 一時停止チェック
		while (this.scanControlState.isPaused) {
			console.log("⏸️ Scan is paused, waiting...");

			// 一時停止中のイベント送信
			scanEventEmitter.emitScanProgress({
				type: "progress",
				scanId,
				phase: "metadata", // 現在のフェーズを維持
				progress: this.updateProgress,
				processedFiles: 0,
				totalFiles: 0,
				message: "スキャンが一時停止中です",
			});

			// 500ms待機してから再チェック
			await this.sleep(500);

			// 一時停止中にキャンセルされた場合の処理
			if (
				this.scanControlState.isCancelled ||
				this.scanControlState.shouldStop
			) {
				throw new Error("Scan was cancelled during pause");
			}
		}
	}

	/**
	 * スキャン開始時に制御状態を初期化
	 */
	private resetScanControlState(scanId: string): void {
		this.currentScanId = scanId;
		this.scanControlState = {
			isPaused: false,
			isCancelled: false,
			shouldStop: false,
		};

		// 詳細プログレス追跡もリセット
		const now = new Date();
		this.scanStartTime = now;
		this.phaseStartTime = now;
		this.lastProgressUpdate = now;
		this.processedFilesInCurrentWindow = 0;
		this.progressWindowStartTime = now;
	}

	/**
	 * 処理速度と推定時間を計算
	 */
	private calculateProgressMetrics(
		processedFiles: number,
		totalFiles: number,
	): {
		processingSpeed: number;
		estimatedTimeRemaining: number;
		totalElapsedTime: number;
		currentPhaseElapsed: number;
	} {
		const now = new Date();

		// 全体の経過時間（秒）
		const totalElapsedTime = this.scanStartTime
			? (now.getTime() - this.scanStartTime.getTime()) / 1000
			: 0;

		// 現在フェーズの経過時間（秒）
		const currentPhaseElapsed = this.phaseStartTime
			? (now.getTime() - this.phaseStartTime.getTime()) / 1000
			: 0;

		// 処理速度計算（移動平均ウィンドウ：30秒）
		let processingSpeed = 0;
		if (this.progressWindowStartTime && this.lastProgressUpdate) {
			const windowElapsed =
				(now.getTime() - this.progressWindowStartTime.getTime()) / 1000;
			if (windowElapsed > 0) {
				processingSpeed = this.processedFilesInCurrentWindow / windowElapsed;
			}

			// 設定時間経過したらウィンドウをリセット
			if (windowElapsed >= SCAN.PROGRESS_WINDOW_DURATION_SEC) {
				this.progressWindowStartTime = now;
				this.processedFilesInCurrentWindow = 0;
			}
		}

		// 推定残り時間（秒）
		let estimatedTimeRemaining = 0;
		if (processingSpeed > 0 && totalFiles > processedFiles) {
			const remainingFiles = totalFiles - processedFiles;
			estimatedTimeRemaining = remainingFiles / processingSpeed;
		}

		return {
			processingSpeed,
			estimatedTimeRemaining,
			totalElapsedTime,
			currentPhaseElapsed,
		};
	}

	/**
	 * フェーズ開始時の時間をリセット
	 */
	private resetPhaseTimer(): void {
		this.phaseStartTime = new Date();
	}

	/**
	 * メモリ使用量を監視してパフォーマンス情報を取得
	 */
	private getMemoryUsage(): {
		used: number;
		free: number;
		total: number;
		usagePercent: number;
	} {
		const memUsage = process.memoryUsage();
		const totalMemMB = Math.round(memUsage.rss / 1024 / 1024);
		const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
		const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
		const usagePercent = Math.round(
			(memUsage.heapUsed / memUsage.heapTotal) * 100,
		);

		// 履歴を更新（直近SCAN.MEMORY_USAGE_HISTORY_SIZE回分を保持）
		this.memoryUsageHistory.push(totalMemMB);
		if (this.memoryUsageHistory.length > SCAN.MEMORY_USAGE_HISTORY_SIZE) {
			this.memoryUsageHistory.shift();
		}

		return {
			used: heapUsedMB,
			free: heapTotalMB - heapUsedMB,
			total: heapTotalMB,
			usagePercent,
		};
	}

	/**
	 * 現在のシステム状況に基づいて最適なバッチサイズを計算
	 */
	private calculateOptimalBatchSize(): number {
		const memUsage = this.getMemoryUsage();
		const baseBatchSize = this.scanSettings.batchSize;

		// メモリ使用率に基づいてバッチサイズを調整
		if (memUsage.usagePercent > SCAN.MEMORY_HIGH_THRESHOLD) {
			// メモリ使用率が高い場合はバッチサイズを削減
			return Math.max(
				Math.floor(baseBatchSize * SCAN.BATCH_SIZE_REDUCTION_RATIO),
				SCAN.MIN_BATCH_SIZE,
			);
		}
		if (memUsage.usagePercent < SCAN.MEMORY_LOW_THRESHOLD) {
			// メモリに余裕がある場合はバッチサイズを増加
			return Math.min(
				Math.floor(baseBatchSize * SCAN.BATCH_SIZE_INCREASE_RATIO),
				SCAN.MAX_BATCH_SIZE,
			);
		}

		// 処理優先度による調整
		switch (this.scanSettings.processingPriority) {
			case "low":
				return Math.max(
					Math.floor(baseBatchSize * SCAN.LOW_PRIORITY_RATIO),
					SCAN.MIN_BATCH_SIZE,
				);
			case "high":
				return Math.min(
					Math.floor(baseBatchSize * SCAN.HIGH_PRIORITY_RATIO),
					SCAN.MAX_BATCH_SIZE,
				);
			default:
				return baseBatchSize;
		}
	}

	/**
	 * メモリ使用量が設定しきい値を超えていないかチェック
	 */
	private checkMemoryThreshold(): boolean {
		const memUsage = this.getMemoryUsage();
		const thresholdMB = this.scanSettings.memoryThresholdMB;

		if (memUsage.used > thresholdMB) {
			console.warn(
				`⚠️ Memory usage (${memUsage.used}MB) exceeds threshold (${thresholdMB}MB)`,
			);
			return false;
		}

		return true;
	}

	/**
	 * CPU使用率を取得（Node.js process.cpuUsage()を使用）
	 */
	private getCPUUsage(): number {
		const currentUsage = process.cpuUsage(this.lastCPUUsage);
		const totalUsage = currentUsage.user + currentUsage.system;

		// マイクロ秒を秒に変換し、CPU使用率を計算
		const totalTime = totalUsage / 1000000; // マイクロ秒 -> 秒
		const cpuPercent = Math.min(totalTime * 100, 100); // 100%を上限

		this.lastCPUUsage = process.cpuUsage();
		return Math.round(cpuPercent);
	}

	/**
	 * システムリソース状況を総合的にチェック
	 */
	private async checkSystemResources(scanId: string): Promise<void> {
		// CPU使用率チェック
		if (this.scanSettings.autoPauseOnHighCPU) {
			const cpuUsage = this.getCPUUsage();

			if (cpuUsage > this.scanSettings.autoPauseThreshold) {
				console.warn(
					`⚠️ High CPU usage detected (${cpuUsage}%), auto-pausing scan`,
				);

				// 自動一時停止
				this.scanControlState.isPaused = true;

				// 一時停止イベント送信
				scanEventEmitter.emitScanControl({
					type: "pause",
					scanId,
				});

				// 一時停止状況をプログレスイベントとして送信
				scanEventEmitter.emitScanProgress({
					type: "progress",
					scanId,
					phase: "metadata",
					progress: 0,
					processedFiles: 0,
					totalFiles: 0,
					message: `高CPU使用率により自動一時停止 (CPU: ${cpuUsage}%)`,
				});

				// CPU使用率が下がるまで待機
				while (
					this.getCPUUsage() >
					this.scanSettings.autoPauseThreshold *
						SCAN.CPU_AUTO_RESUME_THRESHOLD_RATIO
				) {
					await this.sleep(SCAN.CPU_CHECK_INTERVAL_MS); // 設定間隔でチェック
				}

				// 自動再開
				this.scanControlState.isPaused = false;
				console.log("✅ CPU usage normalized, auto-resuming scan");

				scanEventEmitter.emitScanControl({
					type: "resume",
					scanId,
				});

				// 再開状況をプログレスイベントとして送信
				scanEventEmitter.emitScanProgress({
					type: "progress",
					scanId,
					phase: "metadata",
					progress: 0,
					processedFiles: 0,
					totalFiles: 0,
					message: "CPU使用率が正常化したため自動再開",
				});
			}
		}

		// 時間帯による制御チェック
		if (this.scanSettings.autoPauseTimeRange.enabled) {
			const now = new Date();
			const currentHour = now.getHours();
			const { startHour, endHour } = this.scanSettings.autoPauseTimeRange;

			const isInPauseRange =
				startHour <= endHour
					? currentHour >= startHour && currentHour < endHour
					: currentHour >= startHour || currentHour < endHour;

			if (isInPauseRange && !this.scanControlState.isPaused) {
				console.log(
					`⏰ Entering auto-pause time range (${startHour}:00-${endHour}:00)`,
				);
				this.scanControlState.isPaused = true;

				scanEventEmitter.emitScanControl({
					type: "pause",
					scanId,
				});

				// 一時停止状況をプログレスイベントとして送信
				scanEventEmitter.emitScanProgress({
					type: "progress",
					scanId,
					phase: "metadata",
					progress: 0,
					processedFiles: 0,
					totalFiles: 0,
					message: `指定時間帯のため自動一時停止 (${startHour}:00-${endHour}:00)`,
				});
			} else if (!isInPauseRange && this.scanControlState.isPaused) {
				console.log("⏰ Exiting auto-pause time range, resuming scan");
				this.scanControlState.isPaused = false;

				scanEventEmitter.emitScanControl({
					type: "resume",
					scanId,
				});

				// 再開状況をプログレスイベントとして送信
				scanEventEmitter.emitScanProgress({
					type: "progress",
					scanId,
					phase: "metadata",
					progress: 0,
					processedFiles: 0,
					totalFiles: 0,
					message: "指定時間帯が終了したため自動再開",
				});
			}
		}
	}

	/**
	 * スキャン設定を更新
	 */
	updateScanSettings(settings: Partial<ScanSettings>): void {
		this.scanSettings = { ...this.scanSettings, ...settings };
		console.log("📝 Scan settings updated:", this.scanSettings);
	}

	/**
	 * 現在のスキャン設定を取得
	 */
	getScanSettings(): ScanSettings {
		return { ...this.scanSettings };
	}

	/**
	 * スキャン設定をデフォルトにリセット
	 */
	resetScanSettings(): void {
		this.scanSettings = { ...DEFAULT_SCAN_SETTINGS };
		console.log("🔄 Scan settings reset to default:", this.scanSettings);
	}

	/**
	 * データベースからスキャン設定を読み込み
	 */
	private async loadScanSettings() {
		try {
			// 既存ScanSettingsテーブルを使用
			const settings = await prisma.scanSettings.findUnique({
				where: { id: "scan_settings" },
			});

			if (settings) {
				this.lastFullScanTime = settings.lastFullScan;
				this.isUpdating = settings.isScanning;
				this.updateProgress = settings.scanProgress;
			} else {
				// 初回作成 - nullのまま（スキャン実行時に設定）
				console.log("キャッシュ設定を初期化します - 初回スキャンが必要");
			}
		} catch (error) {
			console.warn("キャッシュ設定読み込みエラー:", error);
			// エラー時もnullのまま（初回スキャンが必要）
		}
	}

	/**
	 * スキャン設定をデータベースに保存
	 */
	private async saveScanSettings() {
		try {
			// nullの場合は保存しない
			if (!this.lastFullScanTime) return;

			// DB内のファイル数を取得
			const totalFiles = await prisma.videoMetadata.count();

			// 既存ScanSettingsテーブルを使用
			await prisma.scanSettings.upsert({
				where: { id: "scan_settings" },
				update: {
					lastFullScan: this.lastFullScanTime,
					isScanning: this.isUpdating,
					scanProgress: this.updateProgress,
					totalFiles: totalFiles,
				},
				create: {
					id: "scan_settings",
					lastFullScan: this.lastFullScanTime,
					isScanning: this.isUpdating,
					scanProgress: this.updateProgress,
					totalFiles: totalFiles,
				},
			});
		} catch (error) {
			console.warn("スキャン設定保存エラー:", error);
		}
	}

	/**
	 * 週1回の自動フルスキャン設定（日曜深夜3時）
	 */
	private setupWeeklyUpdate() {
		if (this.cronJob) {
			this.cronJob.stop();
		}

		// 日曜日 午前3時に実行
		this.cronJob = cron.schedule(
			"0 3 * * 0",
			async () => {
				console.log("週次自動フルスキャン開始...");
				try {
					await this.buildInitialCache();
					console.log("週次自動フルスキャン完了");
				} catch (error) {
					console.error("週次自動フルスキャンエラー:", error);
				}
			},
			{
				timezone: "Asia/Tokyo",
			},
		);

		console.log("週次自動更新スケジュール設定完了（日曜 3:00 AM JST）");
	}

	/**
	 * 指定されたディレクトリから動画ファイルを再帰的にスキャン（VideoScanServiceと同じ方式）
	 */
	private async scanDirectory(
		dirPath: string,
	): Promise<Array<{ filePath: string; fileName: string }>> {
		const videos: Array<{ filePath: string; fileName: string }> = [];

		try {
			const items = await fs.readdir(dirPath, { withFileTypes: true });

			for (const item of items) {
				const fullPath = path.join(dirPath, item.name);

				if (item.isDirectory()) {
					const subVideos = await this.scanDirectory(fullPath);
					videos.push(...subVideos);
				} else if (item.isFile() && isVideoFile(item.name)) {
					try {
						const normalizedPath = normalizePath(fullPath);
						videos.push({
							filePath: normalizedPath,
							fileName: item.name,
						});
					} catch (error) {
						console.warn(`Failed to process file ${fullPath}:`, error);
					}
				}
			}
		} catch (error) {
			console.error(`Failed to scan directory ${dirPath}:`, error);
			throw new Error(`Directory scan failed: ${error}`);
		}

		return videos;
	}

	/**
	 * フルキャッシュ構築（起動時・週次更新）
	 */
	async buildInitialCache(): Promise<void> {
		console.log("フルキャッシュ構築開始...");
		this.isUpdating = true;
		this.updateProgress = 0;
		await this.saveScanSettings();

		// チェックポイントから復旧可能かチェック
		const existingCheckpoint = await this.getValidCheckpoint();
		if (existingCheckpoint && existingCheckpoint.scanType === "full") {
			console.log("前回の中断されたスキャンを検出しました。復旧が可能です。");
			// TODO: 復旧処理を実装（今回は新規スキャンとして続行）
			await this.invalidateCheckpoint();
		}

		try {
			const videoDirectories = getVideoDirectories();
			let totalFiles = 0;
			let processedFiles = 0;

			// 新しいスキャンID生成
			const scanId = this.generateScanId();
			console.log(`スキャンID: ${scanId}`);

			// 制御状態を初期化
			this.resetScanControlState(scanId);

			// 📡 スキャン開始イベント送信
			scanEventEmitter.emitScanProgress({
				type: "phase",
				scanId,
				phase: "discovery",
				progress: 0,
				processedFiles: 0,
				totalFiles: 0,
				message: "スキャン開始 - ディレクトリを探索中...",
			});

			// 現在のDBレコード数を記録（ロールバック時の参考用）
			const initialRecordCount = await prisma.videoMetadata.count();
			console.log(`スキャン開始 - 既存レコード数: ${initialRecordCount}`);

			// 全ディレクトリからビデオファイルを収集（DB操作前に完了）
			const allVideoFiles: Array<{ filePath: string; fileName: string }> = [];

			for (const directory of videoDirectories) {
				if (!(await directoryExists(directory))) {
					console.warn(`ディレクトリが存在しません: ${directory}`);
					continue;
				}

				try {
					const videoFiles = await this.scanDirectory(directory);
					allVideoFiles.push(...videoFiles);
				} catch (error) {
					console.warn(`ディレクトリスキャンエラー: ${directory}`, error);
				}
			}

			console.log(`発見したファイル数: ${allVideoFiles.length}`);

			// フェーズ切り替え時にタイマーをリセット
			this.resetPhaseTimer();

			// 📡 ディスカバリー完了イベント送信
			const discoveryMetrics = this.calculateProgressMetrics(
				0,
				allVideoFiles.length,
			);
			scanEventEmitter.emitScanProgress({
				type: "phase",
				scanId,
				phase: "metadata",
				progress: 10,
				processedFiles: 0,
				totalFiles: allVideoFiles.length,
				message: `${allVideoFiles.length}ファイルを発見 - メタデータ処理開始`,
				phaseStartTime: this.phaseStartTime || undefined,
				totalElapsedTime: discoveryMetrics.totalElapsedTime,
				currentPhaseElapsed: 0, // 新フェーズ開始
			});

			// 📝 チェックポイント保存: ファイル発見フェーズ完了
			await this.saveCheckpoint({
				scanId,
				scanType: "full",
				phase: "discovery",
				processedFiles: 0,
				totalFiles: allVideoFiles.length,
			});

			// 全データをメモリ上で準備（トランザクション前に完全に準備）
			const allDbRecords: Array<{
				id: string;
				filePath: string;
				fileName: string;
				title: string;
				fileSize: number;
				episode: number | null;
				year: number | null;
				lastModified: Date;
			}> = [];

			console.log("ファイルメタデータ処理中...");

			// 並列処理でファイル情報をDBレコード形式に変換
			const concurrentOperations = this.scanSettings.maxConcurrentOperations;
			console.log(
				`🔧 Using ${concurrentOperations} concurrent operations for metadata processing`,
			);

			// ファイルを並列処理用にチャンクに分割
			const chunks: Array<Array<{ filePath: string; fileName: string }>> = [];
			const chunkSize = Math.ceil(allVideoFiles.length / concurrentOperations);

			for (let i = 0; i < allVideoFiles.length; i += chunkSize) {
				chunks.push(allVideoFiles.slice(i, i + chunkSize));
			}

			// 並列処理でメタデータを抽出
			const processChunk = async (
				chunk: Array<{ filePath: string; fileName: string }>,
				chunkIndex: number,
			): Promise<
				Array<{
					id: string;
					filePath: string;
					fileName: string;
					title: string;
					fileSize: number;
					episode: number | null;
					year: number | null;
					lastModified: Date;
				}>
			> => {
				const chunkRecords: typeof allDbRecords = [];

				for (let i = 0; i < chunk.length; i++) {
					// 制御状態をチェック（一時停止・キャンセル）
					await this.checkScanControl(scanId);

					const videoFile = chunk[i];

					try {
						// 既存のパーサーを使用して情報抽出
						const parsedInfo = parseVideoFileName(videoFile.fileName);

						// DBレコードとして準備
						chunkRecords.push({
							id: videoFile.filePath,
							filePath: videoFile.filePath,
							fileName: videoFile.fileName,
							title: parsedInfo.cleanTitle,
							fileSize: 0, // ファイルサイズはstatが必要なため省略（HDDアクセス削減）
							episode: this.extractEpisode(videoFile.fileName) ?? null,
							year: parsedInfo.broadcastDate?.getFullYear() ?? null,
							lastModified: new Date(), // 仮の値、実際のstatは重いため省略
						});

						processedFiles++;

						// チャンク内でのプログレス更新
						if (i % Math.max(Math.floor(chunk.length / 10), 1) === 0) {
							console.log(
								`📊 Chunk ${chunkIndex + 1}/${chunks.length}: ${i + 1}/${chunk.length} processed`,
							);
						}
					} catch (fileError) {
						console.warn(
							`ファイル処理エラー (chunk ${chunkIndex}): ${videoFile.fileName}`,
							fileError,
						);
					}
				}

				return chunkRecords;
			};

			// 全チャンクを並列実行
			const chunkPromises = chunks.map((chunk, index) =>
				processChunk(chunk, index),
			);
			const chunkResults = await Promise.all(chunkPromises);

			// 結果をマージ
			for (const chunkRecords of chunkResults) {
				allDbRecords.push(...chunkRecords);
			}

			// 並列処理完了後の進捗更新
			processedFiles = allDbRecords.length;
			console.log(
				`🎯 Parallel metadata processing completed: ${processedFiles} files processed using ${concurrentOperations} concurrent operations`,
			);

			// 📡 メタデータ処理完了の進捗イベント送信
			const metadataMetrics = this.calculateProgressMetrics(
				processedFiles,
				allVideoFiles.length,
			);
			const memUsage = this.getMemoryUsage();

			const metadataMessage = this.scanSettings.showResourceMonitoring
				? `並列メタデータ処理完了 (${processedFiles}/${allVideoFiles.length}) - Memory: ${memUsage.used}MB (${memUsage.usagePercent}%) - Workers: ${concurrentOperations}`
				: `並列メタデータ処理完了 (${processedFiles}/${allVideoFiles.length}) - Workers: ${concurrentOperations}`;

			scanEventEmitter.emitScanProgress({
				type: "progress",
				scanId,
				phase: "metadata",
				progress: 50, // メタデータ処理完了で50%
				processedFiles,
				totalFiles: allVideoFiles.length,
				currentFile: undefined,
				message: metadataMessage,
				processingSpeed: metadataMetrics.processingSpeed,
				estimatedTimeRemaining: metadataMetrics.estimatedTimeRemaining,
				phaseStartTime: this.phaseStartTime || undefined,
				totalElapsedTime: metadataMetrics.totalElapsedTime,
				currentPhaseElapsed: metadataMetrics.currentPhaseElapsed,
			});

			totalFiles = allDbRecords.length;
			console.log(`メタデータ準備完了: ${totalFiles}レコード`);

			// データベースフェーズに切り替え
			this.resetPhaseTimer();

			// 📡 メタデータ処理完了イベント送信
			const metadataCompleteMetrics = this.calculateProgressMetrics(
				totalFiles,
				totalFiles,
			);
			scanEventEmitter.emitScanProgress({
				type: "phase",
				scanId,
				phase: "database",
				progress: 50,
				processedFiles: totalFiles,
				totalFiles: totalFiles,
				message: "メタデータ処理完了 - データベース更新開始",
				phaseStartTime: this.phaseStartTime || undefined,
				totalElapsedTime: metadataCompleteMetrics.totalElapsedTime,
				currentPhaseElapsed: 0, // 新フェーズ開始
			});

			// 📝 チェックポイント保存: メタデータフェーズ完了
			await this.saveCheckpoint({
				scanId,
				scanType: "full",
				phase: "metadata",
				processedFiles: allDbRecords.length,
				totalFiles: allDbRecords.length,
				metadataCompleted: true,
			});

			// データベース処理開始前の制御チェック
			await this.checkScanControl(scanId);

			// 🔒 重要: トランザクション内でDBを安全に更新
			console.log("データベース更新開始（トランザクション内）...");
			await prisma.$transaction(
				async (tx) => {
					// 1. 既存データを削除
					await tx.videoMetadata.deleteMany({});
					console.log("既存データクリア完了");

					// 2. 動的バッチインサート（メモリとパフォーマンス設定に基づく）
					let BATCH_SIZE = this.calculateOptimalBatchSize();
					console.log(`📊 Initial batch size: ${BATCH_SIZE}`);

					for (let i = 0; i < allDbRecords.length; i += BATCH_SIZE) {
						// トランザクション内での制御チェック（非同期処理のため）
						await this.checkScanControl(scanId);

						// メモリ使用量チェック（設定に基づく）
						if (!this.checkMemoryThreshold()) {
							// メモリしきい値を超えた場合の処理
							if (this.scanSettings.showResourceMonitoring) {
								console.warn(
									"⚠️ Memory threshold exceeded, reducing batch size",
								);
							}
							BATCH_SIZE = Math.max(
								Math.floor(BATCH_SIZE * SCAN.BATCH_SIZE_REDUCTION_RATIO),
								SCAN.MIN_BATCH_SIZE_AFTER_REDUCTION,
							);
						}

						const batch = allDbRecords.slice(i, i + BATCH_SIZE);

						await tx.videoMetadata.createMany({
							data: batch,
						});

						// プログレス更新（50%〜100%）
						const dbProgress = Math.floor(
							((i + batch.length) / allDbRecords.length) * 50,
						);
						this.updateProgress = 50 + dbProgress;

						// 📡 データベース更新進捗イベント送信（メモリ情報付き）
						this.processedFilesInCurrentWindow += batch.length;
						const dbMetrics = this.calculateProgressMetrics(
							i + batch.length,
							allDbRecords.length,
						);
						const memUsage = this.getMemoryUsage();

						const progressMessage = this.scanSettings.showResourceMonitoring
							? `データベース更新中 (${i + batch.length}/${allDbRecords.length}) - Memory: ${memUsage.used}MB (${memUsage.usagePercent}%) - Batch: ${BATCH_SIZE}`
							: `データベース更新中 (${i + batch.length}/${allDbRecords.length})`;

						scanEventEmitter.emitScanProgress({
							type: "progress",
							scanId,
							phase: "database",
							progress: 50 + dbProgress,
							processedFiles: i + batch.length,
							totalFiles: allDbRecords.length,
							message: progressMessage,
							processingSpeed: dbMetrics.processingSpeed,
							estimatedTimeRemaining: dbMetrics.estimatedTimeRemaining,
							phaseStartTime: this.phaseStartTime || undefined,
							totalElapsedTime: dbMetrics.totalElapsedTime,
							currentPhaseElapsed: dbMetrics.currentPhaseElapsed,
						});

						console.log(
							`DBバッチ保存: ${i + batch.length}/${allDbRecords.length}`,
						);
					}

					console.log("全データベース保存完了");
				},
				{
					// トランザクションタイムアウト（大量ファイル対応）
					timeout: SCAN.TRANSACTION_TIMEOUT_MS,
				},
			);

			// ✅ スキャン完了: チェックポイントを無効化
			await this.invalidateCheckpoint();

			this.lastFullScanTime = new Date();
			this.updateProgress = 100;

			// 📡 スキャン完了イベント送信
			const finalMetrics = this.calculateProgressMetrics(
				totalFiles,
				totalFiles,
			);
			scanEventEmitter.emitScanProgress({
				type: "complete",
				scanId,
				phase: "database",
				progress: 100,
				processedFiles: totalFiles,
				totalFiles: totalFiles,
				message: `スキャン完了 - ${totalFiles}ファイル処理完了`,
				processingSpeed: 0, // 完了時は速度0
				estimatedTimeRemaining: 0, // 残り時間0
				phaseStartTime: this.phaseStartTime || undefined,
				totalElapsedTime: finalMetrics.totalElapsedTime,
				currentPhaseElapsed: finalMetrics.currentPhaseElapsed,
			});

			console.log(
				`フルDBキャッシュ構築完了: ${totalFiles}ファイル（メモリ使用: 数KB）`,
			);
		} catch (error) {
			// 🚨 エラーハンドリング強化
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const isCancelledError = errorMessage.includes("cancelled");

			if (isCancelledError) {
				console.log("❌ スキャンがユーザーによってキャンセルされました");
			} else {
				console.error("フルキャッシュ構築中にエラーが発生:", error);
			}

			// トランザクション外でエラーが発生した場合の処理
			if (error instanceof Error && !isCancelledError) {
				console.error("エラー詳細:", {
					message: error.message,
					stack: error.stack,
				});
			}

			// プログレス状態をエラー状態にリセット
			this.updateProgress = -1; // エラー状態を示す特殊値

			// 📡 エラーイベント送信（scanIdが利用可能な場合のみ）
			try {
				const currentScanId = this.currentScanId || this.generateScanId();
				scanEventEmitter.emitScanProgress({
					type: "error",
					scanId: currentScanId,
					phase: "metadata",
					progress: -1,
					processedFiles: 0,
					totalFiles: 0,
					error: errorMessage,
					message: isCancelledError
						? "スキャンがキャンセルされました"
						: "スキャン処理中にエラーが発生しました",
				});
			} catch (eventError) {
				console.warn("エラーイベント送信失敗:", eventError);
			}

			// エラー情報を永続化
			await this.saveScanSettings();

			// エラーを再度投げて上位に伝達
			throw new Error(
				`ビデオスキャン処理が失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		} finally {
			// 🔒 確実にクリーンアップ
			this.isUpdating = false;
			this.currentScanId = null;

			try {
				await this.saveScanSettings();
				console.log("スキャン設定保存完了");
			} catch (saveError) {
				console.warn("スキャン設定保存エラー:", saveError);
			}
		}
	}

	/**
	 * フロントエンド開いた時の差分チェック
	 */
	async checkAndUpdateIfNeeded(): Promise<UpdateCheckResult> {
		// 初期化を待つ（強制的に）
		if (!this.initialized) {
			await this.ensureInitialized();
		}

		// DBから直接最新の値を取得（欺瞞防止）
		const settings = await prisma.scanSettings.findUnique({
			where: { id: "scan_settings" },
		});

		const daysSinceLastScan = settings?.lastFullScan
			? Math.floor(
					(new Date().getTime() - settings.lastFullScan.getTime()) /
						(1000 * 60 * 60 * 24),
				)
			: -1;

		if (daysSinceLastScan >= 7 && !this.isUpdating) {
			console.log(`${daysSinceLastScan}日経過 - 差分更新を開始`);
			// 即座に更新状態に設定（メモリとDB両方）
			this.isUpdating = true;
			this.updateProgress = 0;

			// DBにも更新中状態を反映
			await prisma.scanSettings.upsert({
				where: { id: "scan_settings" },
				update: {
					isScanning: true,
					scanProgress: 0,
				},
				create: {
					id: "scan_settings",
					isScanning: true,
					scanProgress: 0,
				},
			});

			// 非同期で差分更新を開始（レスポンスをブロックしない）
			setImmediate(() => this.performIncrementalUpdate());

			return {
				isUpdating: true,
				needsUpdate: true,
				daysSince: daysSinceLastScan,
			};
		}

		return {
			isUpdating: this.isUpdating,
			needsUpdate: false,
			daysSince: daysSinceLastScan,
		};
	}

	/**
	 * 軽量な差分更新（変更ファイルのみ）
	 */
	private async performIncrementalUpdate(): Promise<void> {
		try {
			this.isUpdating = true;
			this.updateProgress = 0;
			console.log("差分更新開始...");

			const videoDirectories = getVideoDirectories();
			let addedFiles = 0;
			let processedDirs = 0;

			for (const directory of videoDirectories) {
				if (!(await directoryExists(directory))) continue;

				try {
					const videoFiles = await this.scanDirectory(directory);

					for (const videoFile of videoFiles) {
						// DBにないファイルのみチェック
						const existsInDb = await prisma.videoMetadata.findUnique({
							where: { filePath: videoFile.filePath },
						});

						if (!existsInDb) {
							try {
								const stats = await fs.stat(videoFile.filePath);

								// 最後のスキャン以降に作成/更新されたファイルのみ処理
								if (
									this.lastFullScanTime &&
									(stats.birthtime > this.lastFullScanTime ||
										stats.mtime > this.lastFullScanTime)
								) {
									// 既存のパーサーを使用して情報抽出
									const parsedInfo = parseVideoFileName(videoFile.fileName);

									// DBに保存
									await prisma.videoMetadata.create({
										data: {
											id: videoFile.filePath,
											filePath: videoFile.filePath,
											fileName: videoFile.fileName,
											title: parsedInfo.cleanTitle,
											fileSize: stats.size,
											episode: this.extractEpisode(videoFile.fileName),
											year: parsedInfo.broadcastDate?.getFullYear(),
											lastModified: stats.mtime,
										},
									});
									addedFiles++;
								}
							} catch (statError) {
								console.warn(
									`ファイルstat失敗: ${videoFile.filePath}`,
									statError,
								);
							}
						}
					}

					processedDirs++;
					this.updateProgress = Math.floor(
						(processedDirs / videoDirectories.length) * 100,
					);

					// ディレクトリ間で少し休憩（HDDに優しく）
					await this.sleep(50);
				} catch (dirError) {
					console.warn(`ディレクトリスキャンエラー: ${directory}`, dirError);
				}
			}

			this.lastFullScanTime = new Date();
			console.log(`差分更新完了: ${addedFiles}ファイル追加`);
		} finally {
			this.isUpdating = false;
			this.updateProgress = 100;
			await this.saveScanSettings();
		}
	}

	/**
	 * DBベースでの超高速検索（メモリ使用量：数KB）
	 * 既存のVideoScanService.searchVideosと互換性のある形式
	 */
	async searchVideos(searchQuery = ""): Promise<SearchResult> {
		try {
			// DB件数チェック
			const totalCount = await prisma.videoMetadata.count();
			if (totalCount === 0) {
				return {
					success: false,
					videos: [],
					totalFound: 0,
					message: "DBが空です。初期化中の可能性があります。",
					error: "DB not ready",
				};
			}

			let videoMetadata: Array<{
				id: string;
				title: string;
				fileName: string;
				filePath: string;
				fileSize: bigint;
				episode: number | null;
				year: number | null;
			}>;

			if (!searchQuery.trim()) {
				// 空の検索クエリの場合は全ファイルを返す（既存の動作に合わせる）
				videoMetadata = await prisma.videoMetadata.findMany({
					orderBy: { title: "asc" },
				});
			} else {
				// キーワード検索（DBで高速検索）
				videoMetadata = await prisma.videoMetadata.findMany({
					where: {
						OR: [
							{ title: { contains: searchQuery } },
							{ fileName: { contains: searchQuery } },
						],
					},
					orderBy: { title: "asc" },
				});
			}

			// VideoMetadata を VideoFileData 形式に変換
			const filteredVideos: VideoFileData[] = videoMetadata.map((metadata) => ({
				id: metadata.id,
				title: metadata.title,
				fileName: metadata.fileName,
				filePath: metadata.filePath,
				fileSize: Number(metadata.fileSize),
				episode: metadata.episode ?? undefined,
				year: metadata.year ?? undefined,
				// 初期値（プログレス情報は後でマージ）
				watchProgress: 0,
				watchTime: 0,
				isLiked: false,
				lastWatched: null,
			}));

			// プログレス情報とマージ
			const videosWithProgress = await this.mergeWithProgress(filteredVideos);

			return {
				success: true,
				videos: videosWithProgress,
				totalFound: videosWithProgress.length,
				message: `Found ${videosWithProgress.length} video(s) from DB (${totalCount} total in DB, memory: 数KB)`,
			};
		} catch (error) {
			console.error("DB search error:", error);
			return {
				success: false,
				videos: [],
				totalFound: 0,
				message: "DB検索に失敗しました",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * 検索結果とプログレス情報をマージ
	 */
	async mergeWithProgress(videos: VideoFileData[]): Promise<VideoFileData[]> {
		if (videos.length === 0) return [];

		try {
			// 検索結果のファイルパスのみでプログレス情報を取得（効率化）
			const filePaths = videos.map((v) => v.filePath);
			const progressData = await prisma.videoProgress.findMany({
				where: { filePath: { in: filePaths } },
			});

			const progressMap = new Map(progressData.map((p) => [p.filePath, p]));

			return videos.map((video) => ({
				...video,
				watchProgress: progressMap.get(video.filePath)?.watchProgress || 0,
				watchTime: progressMap.get(video.filePath)?.watchTime || 0,
				isLiked: progressMap.get(video.filePath)?.isLiked || false,
				lastWatched: progressMap.get(video.filePath)?.lastWatched || null,
			}));
		} catch (error) {
			console.error("プログレス情報マージエラー:", error);
			return videos; // エラー時はプログレス情報なしで返す
		}
	}

	/**
	 * 更新状況取得（読み取り専用）
	 */
	async getUpdateStatus(): Promise<CacheStatus> {
		// DBから現在の値を読み取り専用で取得
		const settings = await prisma.scanSettings.findUnique({
			where: { id: "scan_settings" },
		});

		const lastScanDate = settings?.lastFullScan || null;
		const daysSince = lastScanDate
			? Math.floor(
					(new Date().getTime() - lastScanDate.getTime()) /
						(1000 * 60 * 60 * 24),
				)
			: -1;

		return {
			isUpdating: settings?.isScanning || false,
			progress: settings?.scanProgress || 0,
			lastScanDate,
			daysSinceLastScan: daysSince,
			cacheSize: 0, // DBベースではメモリキャッシュサイズは0
		};
	}

	/**
	 * 手動フルリフレッシュ
	 */
	async manualRefresh(): Promise<void> {
		if (this.isUpdating) {
			throw new Error("既に更新中です");
		}
		await this.buildInitialCache();
	}

	/**
	 * サービス停止時のクリーンアップ
	 */
	async shutdown(): Promise<void> {
		if (this.cronJob) {
			this.cronJob.stop();
		}
		await this.saveScanSettings();
		console.log("VideoCacheService停止完了");
	}

	// ユーティリティメソッド

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * チェックポイント管理メソッド群
	 */

	// チェックポイントを作成/更新
	private async saveCheckpoint(checkpoint: {
		scanId: string;
		scanType: "full" | "incremental";
		phase: "discovery" | "metadata" | "database";
		currentDirectoryIndex?: number;
		processedFiles: number;
		totalFiles: number;
		lastProcessedPath?: string;
		metadataCompleted?: boolean;
		errorMessage?: string;
	}): Promise<void> {
		await prisma.scanCheckpoint.upsert({
			where: { id: "scan_checkpoint" },
			update: {
				...checkpoint,
				lastCheckpointAt: new Date(),
			},
			create: {
				id: "scan_checkpoint",
				...checkpoint,
				isValid: true,
			},
		});
	}

	// 有効なチェックポイントを取得
	private async getValidCheckpoint(): Promise<{
		scanId: string;
		scanType: string;
		phase: string;
		currentDirectoryIndex: number;
		processedFiles: number;
		totalFiles: number;
		lastProcessedPath: string | null;
		metadataCompleted: boolean;
		startedAt: Date;
		lastCheckpointAt: Date;
		errorMessage: string | null;
	} | null> {
		const checkpoint = await prisma.scanCheckpoint.findUnique({
			where: { id: "scan_checkpoint" },
		});

		if (!checkpoint || !checkpoint.isValid) {
			return null;
		}

		// 設定時間以上古いチェックポイントは無効とする
		const expiredTime = new Date(
			Date.now() - SCAN.CHECKPOINT_VALIDITY_HOURS * 60 * 60 * 1000,
		);
		if (checkpoint.lastCheckpointAt < expiredTime) {
			await this.invalidateCheckpoint();
			return null;
		}

		return checkpoint;
	}

	// チェックポイントを無効化
	private async invalidateCheckpoint(): Promise<void> {
		await prisma.scanCheckpoint.upsert({
			where: { id: "scan_checkpoint" },
			update: { isValid: false },
			create: {
				id: "scan_checkpoint",
				scanId: "",
				scanType: "full",
				phase: "discovery",
				isValid: false,
			},
		});
	}

	// 新しいスキャンID生成
	private generateScanId(): string {
		return `${SCAN.SCAN_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	private extractEpisode(fileName: string): number | undefined {
		const episodeMatch = fileName.match(/(?:ep?|episode|第)[\s]*(\d+)/i);
		return episodeMatch ? Number.parseInt(episodeMatch[1], 10) : undefined;
	}
}

// シングルトンインスタンス
export const videoCacheService = new VideoCacheService();
