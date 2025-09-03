import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/libs/prisma";
import { PrismaClient as SettingsPrismaClient } from "../../prisma/generated/settings";
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

import {
	ScanStreamProcessor,
	type VideoFile,
	type ProcessedVideoRecord,
} from "@/services/scan/ScanStreamProcessor";
import { ScanResourceMonitor } from "@/services/scan/ScanResourceMonitor";
import { ScanCheckpointManager } from "@/services/scan/ScanCheckpointManager";
import { ScanProgressCalculator } from "@/services/scan/ScanProgressCalculator";

type SearchResult = {
	success: boolean;
	videos: VideoFileData[];
	totalFound: number;
	message: string;
	error?: string;
};

/**
 * リファクタリングされたビデオキャッシュサービス
 * 機能別にモジュール化されたコンポーネントを使用
 */
class VideoCacheService {
	private isUpdating = false;
	private updateProgress = -1;
	private currentScanId: string | null = null;
	private scanSettings: ScanSettings = DEFAULT_SCAN_SETTINGS;
	private settingsDb: SettingsPrismaClient;

	// 分離されたモジュール
	private resourceMonitor: ScanResourceMonitor;
	private checkpointManager: ScanCheckpointManager;
	private progressCalculator: ScanProgressCalculator;
	private streamProcessor: ScanStreamProcessor | null = null;

	// スキャン制御状態
	private isPaused = false;
	private scanControl = {
		pause: false,
		cancel: false,
		scanId: null as string | null,
	};

	constructor() {
		this.settingsDb = new SettingsPrismaClient();
		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		this.checkpointManager = new ScanCheckpointManager();
		this.progressCalculator = new ScanProgressCalculator();
		this.initializeStreamProcessor();
		this.setupProgressListener();
	}

	private setupProgressListener(): void {
		scanEventEmitter.on("scanProgress", (data) => {
			if (this.currentScanId === data.scanId) {
				this.updateProgress = data.progress;
			}
		});
	}

	private initializeStreamProcessor(): void {
		this.streamProcessor = new ScanStreamProcessor(
			this.scanSettings,
			this.checkScanControl.bind(this),
			this.resourceMonitor.getMemoryUsage.bind(this.resourceMonitor),
			this.progressCalculator.calculateProgressMetrics.bind(
				this.progressCalculator,
			),
			this.progressCalculator.currentPhaseStartTime,
			this.extractEpisode.bind(this),
		);
	}

	async updateScanSettings(newSettings: Partial<ScanSettings>): Promise<void> {
		this.scanSettings = { ...this.scanSettings, ...newSettings };
		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		this.initializeStreamProcessor();
		await this.saveScanSettings();
	}

	private async saveScanSettings(): Promise<void> {
		try {
			await this.settingsDb.scanSettings.upsert({
				where: { id: "scan_settings" },
				update: {
					batchSize: this.scanSettings.batchSize,
					progressUpdateInterval: this.scanSettings.progressUpdateInterval,
					sleepInterval: this.scanSettings.sleepInterval,
					processingPriority: this.scanSettings.processingPriority,
					maxConcurrentOperations: this.scanSettings.maxConcurrentOperations,
					memoryThresholdMB: this.scanSettings.memoryThresholdMB,
					autoPauseOnHighCPU: this.scanSettings.autoPauseOnHighCPU,
					autoPauseThreshold: this.scanSettings.autoPauseThreshold,
					autoPauseStartHour: this.scanSettings.autoPauseTimeRange.startHour,
					autoPauseEndHour: this.scanSettings.autoPauseTimeRange.endHour,
					enableDetailedLogging: this.scanSettings.enableDetailedLogging,
					enableResourceMonitoring: this.scanSettings.showResourceMonitoring,
				},
				create: {
					id: "scan_settings",
					batchSize: this.scanSettings.batchSize,
					progressUpdateInterval: this.scanSettings.progressUpdateInterval,
					sleepInterval: this.scanSettings.sleepInterval,
					processingPriority: this.scanSettings.processingPriority,
					maxConcurrentOperations: this.scanSettings.maxConcurrentOperations,
					memoryThresholdMB: this.scanSettings.memoryThresholdMB,
					autoPauseOnHighCPU: this.scanSettings.autoPauseOnHighCPU,
					autoPauseThreshold: this.scanSettings.autoPauseThreshold,
					autoPauseStartHour: this.scanSettings.autoPauseTimeRange.startHour,
					autoPauseEndHour: this.scanSettings.autoPauseTimeRange.endHour,
					enableDetailedLogging: this.scanSettings.enableDetailedLogging,
					enableResourceMonitoring: this.scanSettings.showResourceMonitoring,
				},
			});
		} catch (error) {
			console.warn("スキャン設定保存エラー:", error);
		}
	}

	private async loadScanSettings(): Promise<void> {
		try {
			const settings = await this.settingsDb.scanSettings.findUnique({
				where: { id: "scan_settings" },
			});

			if (settings) {
				this.scanSettings = {
					batchSize: settings.batchSize,
					progressUpdateInterval: settings.progressUpdateInterval,
					sleepInterval: settings.sleepInterval,
					processingPriority: settings.processingPriority as
						| "low"
						| "normal"
						| "high",
					maxConcurrentOperations: settings.maxConcurrentOperations,
					memoryThresholdMB: settings.memoryThresholdMB,
					autoPauseOnHighCPU: settings.autoPauseOnHighCPU,
					autoPauseThreshold: settings.autoPauseThreshold,
					autoPauseTimeRange: {
						enabled: false,
						startHour: settings.autoPauseStartHour,
						endHour: settings.autoPauseEndHour,
					},
					enableDetailedLogging: settings.enableDetailedLogging,
					showResourceMonitoring: settings.enableResourceMonitoring,
					enablePerformanceMetrics: true,
				};

				// 依存モジュールを再初期化
				this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
				this.initializeStreamProcessor();
			}
		} catch (error) {
			console.warn("スキャン設定読み込みエラー:", error);
		}
	}

	/**
	 * メインスキャン処理
	 */
	async updateVideoDatabase(): Promise<{
		success: boolean;
		totalFiles: number;
		message: string;
		scanId: string;
	}> {
		if (this.isUpdating) {
			return {
				success: false,
				totalFiles: 0,
				message: "スキャンが既に実行中です",
				scanId: this.currentScanId || "",
			};
		}

		this.isUpdating = true;
		this.updateProgress = 0;
		const scanId = this.generateScanId();
		this.currentScanId = scanId;
		this.resetScanControl();

		try {
			this.progressCalculator.startTotalTimer();

			// チェックポイントから再開可能かチェック
			const checkpoint = await this.checkpointManager.getValidCheckpoint();
			if (checkpoint) {
				console.log(`📍 Resuming from checkpoint: ${checkpoint.phase} phase`);
			}

			return await this.performFullScan(scanId);
		} catch (error) {
			scanEventEmitter.emitScanProgress({
				type: "error",
				scanId,
				phase: "metadata",
				progress: -1,
				processedFiles: 0,
				totalFiles: 0,
				error: error instanceof Error ? error.message : String(error),
				message: "スキャン処理中にエラーが発生しました",
			});

			return {
				success: false,
				totalFiles: 0,
				message: `スキャンエラー: ${error instanceof Error ? error.message : String(error)}`,
				scanId,
			};
		} finally {
			this.isUpdating = false;
			this.currentScanId = null;
			this.resetScanControl();
			await this.saveScanSettings();
		}
	}

	private async performFullScan(scanId: string): Promise<{
		success: boolean;
		totalFiles: number;
		message: string;
		scanId: string;
	}> {
		const videoDirectories = getVideoDirectories();

		// Phase 1: ディレクトリ探索（並列）
		const allVideoFiles = await this.performDirectoryDiscovery(
			videoDirectories,
			scanId,
		);

		await this.checkpointManager.saveCheckpoint(
			scanId,
			"full",
			"discovery",
			0,
			allVideoFiles.length,
		);

		// Phase 2: メタデータ処理（ストリームまたは並列）
		let allDbRecords: ProcessedVideoRecord[];

		if (ScanStreamProcessor.shouldUseStreamProcessing(allVideoFiles.length)) {
			if (!this.streamProcessor) {
				throw new Error("Stream processor not initialized");
			}
			allDbRecords = await this.streamProcessor.processFiles(
				allVideoFiles,
				scanId,
			);
		} else {
			allDbRecords = await this.performParallelProcessing(
				allVideoFiles,
				scanId,
			);
		}

		await this.checkpointManager.saveCheckpoint(
			scanId,
			"full",
			"metadata",
			allDbRecords.length,
			allVideoFiles.length,
		);

		// Phase 3: データベース更新
		await this.performDatabaseUpdate(allDbRecords, scanId);

		await this.checkpointManager.invalidateCheckpoint();

		return {
			success: true,
			totalFiles: allDbRecords.length,
			message: `スキャン完了: ${allDbRecords.length}ファイル処理`,
			scanId,
		};
	}

	private async performDirectoryDiscovery(
		videoDirectories: string[],
		scanId: string,
	): Promise<VideoFile[]> {
		scanEventEmitter.emitScanProgress({
			type: "phase",
			scanId,
			phase: "discovery",
			progress: 0,
			processedFiles: 0,
			totalFiles: 0,
			message: "スキャン開始 - ディレクトリを探索中...",
		});

		// 並列ディレクトリスキャン
		const directoryPromises = videoDirectories.map(async (directory) => {
			if (!(await directoryExists(directory))) {
				return [];
			}
			try {
				return await this.scanDirectory(directory);
			} catch (error) {
				console.warn(`ディレクトリスキャンエラー: ${directory}`, error);
				return [];
			}
		});

		const directoryResults = await Promise.all(directoryPromises);
		const allVideoFiles: VideoFile[] = directoryResults.flat();

		return allVideoFiles;
	}

	private async performParallelProcessing(
		allVideoFiles: VideoFile[],
		scanId: string,
	): Promise<ProcessedVideoRecord[]> {
		this.progressCalculator.resetPhaseTimer();

		const concurrentOperations = this.scanSettings.maxConcurrentOperations;
		const chunkSize = Math.ceil(allVideoFiles.length / concurrentOperations);

		const chunks: VideoFile[][] = [];
		for (let i = 0; i < allVideoFiles.length; i += chunkSize) {
			chunks.push(allVideoFiles.slice(i, i + chunkSize));
		}

		const chunkPromises = chunks.map(async (chunk) => {
			const records: ProcessedVideoRecord[] = [];
			for (const videoFile of chunk) {
				await this.checkScanControl(scanId);
				const parsedInfo = parseVideoFileName(videoFile.fileName);
				records.push({
					id: videoFile.filePath,
					filePath: videoFile.filePath,
					fileName: videoFile.fileName,
					title: parsedInfo.cleanTitle,
					fileSize: 0, // ファイルサイズはffprobe導入時にまとめて取得予定
					episode: this.extractEpisode(videoFile.fileName) ?? null,
					year: parsedInfo.broadcastDate?.getFullYear() ?? null,
					lastModified: new Date(), // ffprobe導入時に実際の値を取得予定
				});
			}
			return records;
		});

		const chunkResults = await Promise.all(chunkPromises);
		return chunkResults.flat();
	}

	private async performDatabaseUpdate(
		allDbRecords: ProcessedVideoRecord[],
		scanId: string,
	): Promise<void> {
		this.progressCalculator.resetPhaseTimer();

		await prisma.$transaction(
			async (tx) => {
				await tx.videoMetadata.deleteMany({});
				await tx.videoMetadata.createMany({
					data: allDbRecords,
				});
			},
			{ timeout: SCAN.TRANSACTION_TIMEOUT_MS },
		);

		scanEventEmitter.emitScanProgress({
			type: "complete",
			scanId,
			phase: "database",
			progress: 100,
			processedFiles: allDbRecords.length,
			totalFiles: allDbRecords.length,
			message: `スキャン完了: ${allDbRecords.length}ファイル処理完了`,
		});
	}

	private async scanDirectory(directory: string): Promise<VideoFile[]> {
		const videoFiles: VideoFile[] = [];
		try {
			const files = await fs.readdir(directory);
			for (const file of files) {
				const filePath = path.join(directory, file);
				if (isVideoFile(file)) {
					videoFiles.push({
						filePath: normalizePath(filePath),
						fileName: file,
					});
				}
			}
		} catch (error) {
			console.warn(`ディレクトリ読み取りエラー: ${directory}`, error);
		}
		return videoFiles;
	}

	private extractEpisode(fileName: string): number | undefined {
		const episodeMatch = fileName.match(/(?:ep?|episode|第)[\s]*(\d+)/i);
		return episodeMatch ? Number.parseInt(episodeMatch[1], 10) : undefined;
	}

	private generateScanId(): string {
		return `${SCAN.SCAN_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	private resetScanControl(): void {
		this.scanControl = { pause: false, cancel: false, scanId: null };
		this.isPaused = false;
	}

	private async checkScanControl(scanId: string): Promise<void> {
		if (this.scanControl.pause && this.scanControl.scanId === scanId) {
			this.isPaused = true;
			while (this.scanControl.pause && !this.scanControl.cancel) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			this.isPaused = false;
		}

		if (this.scanControl.cancel && this.scanControl.scanId === scanId) {
			throw new Error("SCAN_CANCELLED");
		}
	}

	async pauseScan(
		scanId: string,
	): Promise<{ success: boolean; message: string }> {
		if (this.currentScanId !== scanId) {
			return { success: false, message: "無効なスキャンIDです" };
		}
		this.scanControl.pause = true;
		this.scanControl.scanId = scanId;
		return { success: true, message: "スキャンを一時停止中..." };
	}

	async resumeScan(
		scanId: string,
	): Promise<{ success: boolean; message: string }> {
		if (this.currentScanId !== scanId) {
			return { success: false, message: "無効なスキャンIDです" };
		}
		this.scanControl.pause = false;
		return { success: true, message: "スキャンを再開しました" };
	}

	async cancelScan(
		scanId: string,
	): Promise<{ success: boolean; message: string }> {
		if (this.currentScanId !== scanId) {
			return { success: false, message: "無効なスキャンIDです" };
		}
		this.scanControl.cancel = true;
		this.scanControl.scanId = scanId;
		return { success: true, message: "スキャンをキャンセル中..." };
	}

	async searchVideos(query: string): Promise<SearchResult> {
		try {
			const videos = await prisma.videoMetadata.findMany({
				where: {
					OR: [
						{ title: { contains: query } },
						{ fileName: { contains: query } },
					],
				},
				orderBy: { title: "asc" },
			});

			return {
				success: true,
				videos: videos.map((v) => ({
					id: v.id,
					title: v.title,
					fileName: v.fileName,
					filePath: v.filePath,
					fileSize: Number(v.fileSize),
					lastModified: v.lastModified,
					episode: v.episode ?? undefined,
					year: v.year ?? undefined,
					watchProgress: 0,
					watchTime: 0,
					isLiked: false,
				})),
				totalFound: videos.length,
				message: `${videos.length}件の動画が見つかりました`,
			};
		} catch (error) {
			return {
				success: false,
				videos: [],
				totalFound: 0,
				message: "検索中にエラーが発生しました",
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async getAllVideos(): Promise<VideoFileData[]> {
		try {
			const videos = await prisma.videoMetadata.findMany({
				orderBy: { title: "asc" },
			});

			return videos.map((v) => ({
				id: v.id,
				title: v.title,
				fileName: v.fileName,
				filePath: v.filePath,
				fileSize: Number(v.fileSize),
				lastModified: v.lastModified,
				episode: v.episode ?? undefined,
				year: v.year ?? undefined,
				watchProgress: 0,
				watchTime: 0,
				isLiked: false,
			}));
		} catch (error) {
			console.error("動画取得エラー:", error);
			return [];
		}
	}

	getScanSettings(): ScanSettings {
		return this.scanSettings;
	}

	async resetScanSettings(): Promise<void> {
		this.scanSettings = { ...DEFAULT_SCAN_SETTINGS };
		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		this.initializeStreamProcessor();
		await this.saveScanSettings();
	}

	getUpdateStatus(): {
		isUpdating: boolean;
		progress: number;
		message: string;
	} {
		return {
			isUpdating: this.isUpdating,
			progress: this.updateProgress,
			message: this.isUpdating ? "スキャン中..." : "待機中",
		};
	}

	async manualRefresh(): Promise<{ success: boolean; message: string }> {
		const result = await this.updateVideoDatabase();
		return {
			success: result.success,
			message: result.message,
		};
	}

	async checkAndUpdateIfNeeded(): Promise<{
		updated: boolean;
		message: string;
	}> {
		return {
			updated: false,
			message: "手動スキャンのみ対応",
		};
	}

	getCurrentScanStatus(): {
		isScanning: boolean;
		isPaused: boolean;
		progress: number;
		scanId: string | null;
	} {
		return {
			isScanning: this.isUpdating,
			isPaused: this.isPaused,
			progress: this.updateProgress,
			scanId: this.currentScanId,
		};
	}
}

export const videoCacheService = new VideoCacheService();
