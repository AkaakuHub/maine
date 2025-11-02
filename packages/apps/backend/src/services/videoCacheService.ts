import { promises as fs } from "node:fs";
import * as path from "node:path";
import { prisma } from "../libs/prisma";
import type { Prisma } from "@prisma/client";
import { PrismaClient as SettingsPrismaClient } from "../../prisma/generated/settings";
import {
	normalizePath,
	isVideoFile,
	getVideoDirectories,
	directoryExists,
} from "../libs/fileUtils";
import type { VideoFileData } from "../type";
import { parseVideoFileName } from "../utils/videoFileNameParser";
import { sseStore } from "../common/sse/sse-connection.store";
import type { ScanSettings } from "../types/scanSettings";
import { DEFAULT_SCAN_SETTINGS } from "../types/scanSettings";
import { SCAN } from "../utils/constants";
import * as crypto from "node:crypto";

import {
	ScanStreamProcessor,
	type VideoFile,
	type ProcessedVideoRecord,
} from "./scan/ScanStreamProcessor";
import { ScanResourceMonitor } from "./scan/ScanResourceMonitor";
import { ScanCheckpointManager } from "./scan/ScanCheckpointManager";
import { ScanProgressCalculator } from "./scan/ScanProgressCalculator";
import { FFprobeMetadataExtractor } from "./FFprobeMetadataExtractor";
import { ThumbnailGenerator } from "./ThumbnailGenerator";
import { ScanScheduler } from "./ScanScheduler";

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
	private static instance: VideoCacheService | null = null;

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
	private ffprobeExtractor: FFprobeMetadataExtractor;
	private thumbnailGenerator: ThumbnailGenerator;

	// スケジューラー（レイジー初期化）
	private scheduler: ScanScheduler | null = null;
	private schedulerInitialized = false;

	// スキャン制御状態
	private isPaused = false;
	private scanControl = {
		pause: false,
		cancel: false,
		scanId: null as string | null,
	};

	private constructor() {
		this.settingsDb = new SettingsPrismaClient();
		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		this.checkpointManager = new ScanCheckpointManager();
		this.progressCalculator = new ScanProgressCalculator();
		this.ffprobeExtractor = new FFprobeMetadataExtractor();
		this.thumbnailGenerator = new ThumbnailGenerator("./data/thumbnails");

		this.initializeStreamProcessor();
	}

	static getInstance(): VideoCacheService {
		if (!VideoCacheService.instance) {
			VideoCacheService.instance = new VideoCacheService();
		}
		return VideoCacheService.instance;
	}

	// Progress listenerは不要（SSE Connection Storeが直接ブロードキャスト）

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
			sseStore.broadcast({
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

	/**
	 * ファイル変更検出 - 既存データベースレコードと比較して変更を検出
	 */
	private async detectFileChanges(allVideoFiles: VideoFile[]): Promise<{
		changedFiles: VideoFile[];
		unchangedFiles: VideoFile[];
		newFiles: VideoFile[];
		unchangedRecords: ProcessedVideoRecord[];
	}> {
		// 既存レコードを一括取得
		const existingRecords = await prisma.videoMetadata.findMany({
			select: {
				id: true,
				filePath: true,
				fileName: true,
				title: true,
				fileSize: true,
				episode: true,
				year: true,
				duration: true,
				thumbnail_path: true,
				lastModified: true,
				videoId: true,
			},
		});

		const existingRecordMap = new Map(
			existingRecords.map((record) => [
				record.filePath,
				{
					...record,
					fileSize: Number(record.fileSize), // BigIntをnumberに変換
					thumbnailPath: record.thumbnail_path,
					videoId: record.videoId || "", // videoIdを含める
				} as ProcessedVideoRecord,
			]),
		);

		const changedFiles: VideoFile[] = [];
		const unchangedFiles: VideoFile[] = [];
		const newFiles: VideoFile[] = [];
		const unchangedRecords: ProcessedVideoRecord[] = [];

		// 各ファイルの変更状態をチェック
		for (const videoFile of allVideoFiles) {
			const existingRecord = existingRecordMap.get(videoFile.filePath);

			if (!existingRecord) {
				// 新規ファイル
				newFiles.push(videoFile);
				continue;
			}

			try {
				// ファイル統計情報を取得
				const fileStat = await fs.stat(videoFile.filePath);

				// 最終更新時刻とファイルサイズで変更判定
				const hasChanged =
					existingRecord.lastModified.getTime() !== fileStat.mtime.getTime() ||
					existingRecord.fileSize !== fileStat.size;

				if (hasChanged) {
					changedFiles.push(videoFile);
				} else {
					unchangedFiles.push(videoFile);
					unchangedRecords.push(existingRecord);
				}
			} catch (error) {
				// ファイル情報取得エラーの場合は変更ありとして処理
				console.warn(`ファイル情報取得エラー ${videoFile.filePath}:`, error);
				changedFiles.push(videoFile);
			}
		}

		return {
			changedFiles: [...changedFiles, ...newFiles], // 変更ファイル + 新規ファイル
			unchangedFiles,
			newFiles,
			unchangedRecords,
		};
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

		// Phase 1.5: ファイル変更検出（差分スキャン）
		const { changedFiles, unchangedFiles, newFiles, unchangedRecords } =
			await this.detectFileChanges(allVideoFiles);

		// 処理統計をログ出力
		console.log(`スキャン統計:
			- 総ファイル数: ${allVideoFiles.length}
			- 変更/新規ファイル: ${changedFiles.length} (処理対象)
			- 未変更ファイル: ${unchangedFiles.length} (スキップ)
			- 新規ファイル: ${newFiles.length}`);

		// Phase 2: メタデータ処理（変更ファイルのみ処理）
		let processedDbRecords: ProcessedVideoRecord[] = [];
		let deletedFilesCount = 0;

		if (changedFiles.length > 0) {
			if (ScanStreamProcessor.shouldUseStreamProcessing(changedFiles.length)) {
				if (!this.streamProcessor) {
					throw new Error("Stream processor not initialized");
				}
				processedDbRecords = await this.streamProcessor.processFiles(
					changedFiles,
					scanId,
				);
			} else {
				processedDbRecords = await this.performParallelProcessing(
					changedFiles,
					scanId,
				);
			}
		}

		// Phase 2.5: 処理済み + 未変更レコードを統合
		const allDbRecords = [...processedDbRecords, ...unchangedRecords];

		await this.checkpointManager.saveCheckpoint(
			scanId,
			"full",
			"metadata",
			allDbRecords.length,
			allVideoFiles.length,
		);

		// Phase 3: データベース更新
		deletedFilesCount = await this.performDatabaseUpdate(allDbRecords, scanId);

		await this.checkpointManager.invalidateCheckpoint();

		// スキップ統計をSSEで送信
		const unchangedPercentage =
			allVideoFiles.length > 0
				? Math.round((unchangedFiles.length / allVideoFiles.length) * 100)
				: 0;

		sseStore.broadcast({
			type: "scan_stats",
			scanId,
			skipStats: {
				totalFiles: allVideoFiles.length,
				newFiles: newFiles.length,
				changedFiles: changedFiles.length,
				unchangedFiles: unchangedFiles.length,
				deletedFiles: deletedFilesCount,
				unchangedPercentage,
			},
			message: `差分スキャン結果: ${unchangedFiles.length}ファイル（${unchangedPercentage}%）をスキップ`,
		});

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
		sseStore.broadcast({
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
			// ガード節: ディレクトリパスの有効性をチェック
			if (
				!directory ||
				typeof directory !== "string" ||
				directory.trim() === ""
			) {
				console.warn(`無効なディレクトリパスをスキップ: ${directory}`);
				return [];
			}

			const dirExists = await directoryExists(directory);
			if (!dirExists) {
				console.warn(`ディレクトリが存在しないためスキップ: ${directory}`);
				return [];
			}
			try {
				const result = await this.scanDirectory(directory);
				return result;
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

		// メタデータフェーズ開始イベント
		sseStore.broadcast({
			type: "phase",
			scanId,
			phase: "metadata",
			progress: 0,
			processedFiles: 0,
			totalFiles: allVideoFiles.length,
			message: "メタデータとサムネイル処理中...",
		});

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

				const metadata = await this.ffprobeExtractor.extractMetadata(
					videoFile.filePath,
				);
				const parsedInfo = parseVideoFileName(videoFile.fileName);

				// サムネイル生成（既に取得したメタデータを使用）
				let thumbnailPath: string | null = null;
				try {
					const thumbnailResult =
						await this.thumbnailGenerator.generateThumbnail(
							videoFile.filePath,
							metadata,
						);
					if (thumbnailResult.success) {
						thumbnailPath = thumbnailResult.relativePath;
					}
				} catch (error) {
					console.warn(`サムネイル生成失敗 ${videoFile.filePath}:`, error);
				}

				const videoId = crypto
					.createHash("sha256")
					.update(videoFile.filePath)
					.digest("hex");
				records.push({
					id: videoFile.filePath,
					filePath: videoFile.filePath,
					fileName: videoFile.fileName,
					title: parsedInfo.cleanTitle,
					fileSize: metadata.fileSize,
					episode: this.extractEpisode(videoFile.fileName) ?? null,
					year: parsedInfo.broadcastDate?.getFullYear() ?? null,
					duration: metadata.duration,
					thumbnailPath,
					lastModified: metadata.lastModified,
					videoId, // SHA-256ハッシュID (32文字)
				});
			}
			return records;
		});

		const chunkResults = await Promise.all(chunkPromises);
		const allResults = chunkResults.flat();

		// メタデータ処理完了
		sseStore.broadcast({
			type: "progress",
			scanId,
			phase: "metadata",
			progress: 100,
			processedFiles: allResults.length,
			totalFiles: allVideoFiles.length,
			message: `メタデータ処理完了: ${allResults.length}ファイル`,
		});

		return allResults;
	}

	private async performDatabaseUpdate(
		allDbRecords: ProcessedVideoRecord[],
		scanId: string,
	): Promise<number> {
		this.progressCalculator.resetPhaseTimer();

		// データベース更新フェーズ開始
		sseStore.broadcast({
			type: "phase",
			scanId,
			phase: "database",
			progress: 0,
			processedFiles: allDbRecords.length,
			totalFiles: allDbRecords.length,
			message: "データベース更新中...",
		});

		let deletedFilePaths: string[] = [];

		await prisma.$transaction(
			async (tx: Prisma.TransactionClient) => {
				// 1. 既存レコードのファイルパス一覧を取得
				const existingRecords = await tx.videoMetadata.findMany({
					select: { filePath: true },
				});
				const existingFilePaths = new Set(
					existingRecords.map((r) => r.filePath),
				);

				// 2. 現在のスキャン結果のファイルパス一覧
				const currentFilePaths = new Set(allDbRecords.map((r) => r.filePath));

				// 3. 削除されたファイルを特定
				deletedFilePaths = [...existingFilePaths].filter(
					(path) => !currentFilePaths.has(path),
				);

				// 4. 削除されたファイルのレコードを削除
				if (deletedFilePaths.length > 0) {
					await tx.videoMetadata.deleteMany({
						where: {
							filePath: { in: deletedFilePaths },
						},
					});
				}

				// 5. 各レコードをupsert（存在すれば更新、なければ挿入）
				for (const record of allDbRecords) {
					await tx.videoMetadata.upsert({
						where: { id: record.id },
						update: {
							filePath: record.filePath,
							fileName: record.fileName,
							title: record.title,
							fileSize: BigInt(record.fileSize),
							episode: record.episode,
							year: record.year,
							duration: record.duration,
							thumbnail_path: record.thumbnailPath,
							lastModified: record.lastModified,
							metadata_extracted_at: record.duration ? new Date() : null,
							videoId: record.videoId, // SHA-256ハッシュID (32文字)
						},
						create: {
							id: record.id,
							filePath: record.filePath,
							fileName: record.fileName,
							title: record.title,
							fileSize: BigInt(record.fileSize),
							episode: record.episode,
							year: record.year,
							duration: record.duration,
							thumbnail_path: record.thumbnailPath,
							lastModified: record.lastModified,
							metadata_extracted_at: record.duration ? new Date() : null,
							videoId: record.videoId, // SHA-256ハッシュID (32文字)
						},
					});
				}
			},
			{ timeout: SCAN.TRANSACTION_TIMEOUT_MS },
		);

		sseStore.broadcast({
			type: "complete",
			scanId,
			phase: "database",
			progress: 100,
			processedFiles: allDbRecords.length,
			totalFiles: allDbRecords.length,
			message: `スキャン完了: ${allDbRecords.length}ファイル処理完了`,
		});

		return deletedFilePaths.length;
	}

	private async scanDirectory(directory: string): Promise<VideoFile[]> {
		// ガード節: ディレクトリパスが有効かチェック
		if (
			!directory ||
			typeof directory !== "string" ||
			directory.trim() === ""
		) {
			throw new Error(
				"Invalid directory path: directory is undefined or empty",
			);
		}

		const videoFiles: VideoFile[] = [];
		try {
			const files = await fs.readdir(directory);
			for (const file of files) {
				const filePath = path.join(directory, file);
				// ファイルの統計情報を取得
				try {
					const stat = await fs.stat(filePath);

					if (stat.isDirectory()) {
						// サブディレクトリの場合は再帰的にスキャン
						const subDirVideos = await this.scanDirectory(filePath);
						videoFiles.push(...subDirVideos);
					} else if (isVideoFile(file)) {
						// 動画ファイルの場合
						videoFiles.push({
							filePath: normalizePath(filePath),
							fileName: file,
						});
					}
				} catch (statError) {
					console.warn(`[DEBUG] Failed to stat "${filePath}":`, statError);
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
			console.log(`[searchVideos] Query: "${query}"`);

			// 基本的な検索をPrismaのfindManyで実行
			const searchCondition =
				query.trim() === ""
					? {}
					: {
							OR: [
								{ title: { contains: query } },
								{ fileName: { contains: query } },
								{ filePath: { equals: query } }, // 完全一致検索も追加
							],
						};

			const videos = await prisma.videoMetadata.findMany({
				where: searchCondition,
				orderBy: { title: "asc" },
			});

			console.log(
				`[searchVideos] Found ${videos.length} videos matching query`,
			);

			// 動画の基本情報を返す（進捗情報は含めない）
			const videosWithProgress = videos.map((v) => ({
				id: v.id,
				title: v.title,
				fileName: v.fileName,
				filePath: v.filePath,
				fileSize: Number(v.fileSize),
				fileModifiedAt: v.lastModified,
				episode: v.episode ?? undefined,
				year: v.year ?? undefined,
				duration: v.duration ?? undefined,
				thumbnailPath: v.thumbnail_path ?? undefined,
			}));

			console.log(
				`[searchVideos] Returning ${videosWithProgress.length} videos`,
			);

			return {
				success: true,
				videos: videosWithProgress,
				totalFound: videosWithProgress.length,
				message: `${videosWithProgress.length}件の動画が見つかりました`,
			};
		} catch (error) {
			console.error("searchVideos error:", error);
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
			// まず基本的なVideoMetadataを取得
			const videos = await prisma.videoMetadata.findMany({
				orderBy: { title: "asc" },
			});

			console.log(`[getAllVideos] Found ${videos.length} videos in database`);

			// 動画の基本情報を返す（進捗情報は含めない）
			const videosWithProgress = videos.map((v) => ({
				id: v.id,
				title: v.title,
				fileName: v.fileName,
				filePath: v.filePath,
				fileSize: Number(v.fileSize),
				fileModifiedAt: v.lastModified,
				episode: v.episode ?? undefined,
				year: v.year ?? undefined,
				duration: v.duration ?? undefined,
				thumbnailPath: v.thumbnail_path ?? undefined,
			}));

			console.log(
				`[getAllVideos] Returning ${videosWithProgress.length} videos`,
			);
			return videosWithProgress;
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

	/**
	 * スケジューラーを取得（レイジー初期化）
	 */
	getScheduler(): ScanScheduler {
		if (!this.scheduler) {
			this.scheduler = ScanScheduler.getInstance();
			this.scheduler.setScanExecutor(() => this.executeScheduledScan());
			this.scheduler.setManualScanChecker(() => this.isUpdating);
		}
		return this.scheduler;
	}

	/**
	 * スケジューラーを必要な時だけ初期化
	 */
	async initializeSchedulerIfNeeded(): Promise<void> {
		if (typeof window === "undefined" && !this.schedulerInitialized) {
			console.log("🚀 VideoCacheService: スケジューラーを遅延初期化します");
			try {
				await this.getScheduler().initializeFromDatabase();
				this.schedulerInitialized = true;
				console.log("✅ スケジューラーの遅延初期化が完了しました");
			} catch (error) {
				console.error("❌ スケジューラー初期化エラー:", error);
			}
		}
	}

	/**
	 * スケジュールされたスキャン実行
	 */
	private async executeScheduledScan(): Promise<void> {
		console.log("スケジュールされたスキャンを実行中...");

		// 手動スキャンが実行中の場合はスキップ
		if (this.isUpdating) {
			console.log(
				"手動スキャンが実行中のため、スケジュールされたスキャンをスキップ",
			);
			return;
		}

		try {
			// 通常のスキャン実行
			const result = await this.manualRefresh();
			console.log("スケジュールされたスキャン完了:", result.message);
		} catch (error) {
			console.error("スケジュールされたスキャンでエラー:", error);
			throw error;
		}
	}
}

export const videoCacheService = VideoCacheService.getInstance();
