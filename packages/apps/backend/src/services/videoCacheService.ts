import { promises as fs } from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../libs/prisma";
import type { Prisma } from "@prisma/client";
import {
	normalizePath,
	isVideoFile,
	getVideoDirectories,
	directoryExists,
	PlaylistDetector,
	type PlaylistData,
} from "../libs/fileUtils";
import type { SearchResult, VideoFileData } from "../type";
import { parseVideoFileName } from "../utils/videoFileNameParser";
import { sseStore } from "../common/sse/sse-connection.store";
import type { ScanSettings } from "../types/scanSettings";
import { DEFAULT_SCAN_SETTINGS } from "../types/scanSettings";
import { SCAN } from "../utils/constants";

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

	// 分離されたモジュール
	private resourceMonitor: ScanResourceMonitor;
	private checkpointManager: ScanCheckpointManager;
	private progressCalculator: ScanProgressCalculator;
	private streamProcessor: ScanStreamProcessor | null = null;
	private ffprobeExtractor: FFprobeMetadataExtractor;
	private thumbnailGenerator: ThumbnailGenerator;
	private playlistDetector: PlaylistDetector;
	private detectedPlaylists: PlaylistData[] = [];

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
		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		this.checkpointManager = new ScanCheckpointManager();
		this.progressCalculator = new ScanProgressCalculator();
		this.ffprobeExtractor = new FFprobeMetadataExtractor();
		this.thumbnailGenerator = new ThumbnailGenerator("./data/thumbnails");
		this.playlistDetector = new PlaylistDetector();

		// プレイリスト検出を初期化（空の状態で開始）
		this.initializeStreamProcessorWithPlaylists([]);
	}

	static getInstance(): VideoCacheService {
		if (!VideoCacheService.instance) {
			VideoCacheService.instance = new VideoCacheService();
		}
		return VideoCacheService.instance;
	}

	// Progress listenerは不要（SSE Connection Storeが直接ブロードキャスト）

	private initializeStreamProcessorWithPlaylists(
		playlists: PlaylistData[],
	): void {
		this.streamProcessor = new ScanStreamProcessor(
			this.scanSettings,
			this.checkScanControl.bind(this),
			this.resourceMonitor.getMemoryUsage.bind(this.resourceMonitor),
			this.progressCalculator.calculateProgressMetrics.bind(
				this.progressCalculator,
			),
			this.progressCalculator.currentPhaseStartTime,
			this.extractEpisode.bind(this),
			playlists,
		);
		// プレイリスト情報を保存して並列処理でも使用できるようにする
		this.detectedPlaylists = playlists;
	}

	async updateScanSettings(newSettings: Partial<ScanSettings>): Promise<void> {
		this.scanSettings = { ...this.scanSettings, ...newSettings };
		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		// 検出済みのプレイリスト情報を維持して初期化
		this.initializeStreamProcessorWithPlaylists(this.detectedPlaylists);
		await this.saveScanSettings();
	}

	private async loadScanSettings(): Promise<void> {
		const savedSettings = await prisma.scanSettings.findUnique({
			where: { id: "scan_settings" },
		});

		if (!savedSettings) {
			return;
		}

		this.scanSettings = {
			scanMode: savedSettings.scanMode as "lightweight" | "full",
			batchSize: savedSettings.batchSize,
			progressUpdateInterval: savedSettings.progressUpdateInterval,
			sleepInterval: savedSettings.sleepInterval,
			processingPriority: savedSettings.processingPriority as
				| "low"
				| "normal"
				| "high",
			maxConcurrentOperations: savedSettings.maxConcurrentOperations,
			memoryThresholdMB: savedSettings.memoryThresholdMB,
			autoPauseOnHighCPU: savedSettings.autoPauseOnHighCPU,
			autoPauseThreshold: savedSettings.autoPauseThreshold,
			autoPauseTimeRange: {
				enabled: false,
				startHour: savedSettings.autoPauseStartHour,
				endHour: savedSettings.autoPauseEndHour,
			},
			enableDetailedLogging: savedSettings.enableDetailedLogging,
			showResourceMonitoring: savedSettings.enableResourceMonitoring,
			enablePerformanceMetrics: true,
		};

		this.resourceMonitor = new ScanResourceMonitor(this.scanSettings);
		this.initializeStreamProcessorWithPlaylists(this.detectedPlaylists);
	}

	/**
	 * プレイリストをデータベースと同期
	 */
	private async syncPlaylists(
		detectedPlaylists: PlaylistData[],
	): Promise<void> {
		try {
			const existingPlaylists = await prisma.playlist.findMany({
				where: { isActive: true },
			});

			// 新規プレイリストの追加
			for (const detected of detectedPlaylists) {
				const existing = existingPlaylists.find(
					(p) => p.path === detected.path,
				);
				if (!existing) {
					await prisma.playlist.create({
						data: {
							id: detected.id,
							name: detected.name,
							path: detected.path,
							description: detected.description,
							isActive: true,
							createdAt: detected.createdAt,
							updatedAt: detected.updatedAt,
						},
					});
				}
			}

			// 存在しないプレイリストを非活性化
			const detectedPaths = new Set(detectedPlaylists.map((p) => p.path));
			for (const existing of existingPlaylists) {
				if (!detectedPaths.has(existing.path)) {
					await prisma.playlist.update({
						where: { id: existing.id },
						data: { isActive: false },
					});
				}
			}
		} catch (error) {
			console.error("Failed to sync playlists:", error);
			throw error;
		}
	}

	private async saveScanSettings(): Promise<void> {
		try {
			await prisma.scanSettings.upsert({
				where: { id: "scan_settings" },
				update: {
					scanMode: this.scanSettings.scanMode,
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
					scanMode: this.scanSettings.scanMode,
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
			await this.loadScanSettings();
			this.progressCalculator.startTotalTimer();

			// 1. プレイリストを検出して同期
			const videoDirectories = getVideoDirectories();
			const detectedPlaylists =
				await this.playlistDetector.detectPlaylists(videoDirectories);
			await this.syncPlaylists(detectedPlaylists);

			// 2. StreamProcessorをプレイリスト情報で初期化
			this.initializeStreamProcessorWithPlaylists(detectedPlaylists);
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
		existingIdByPath: Map<string, string>;
	}> {
		// 既存レコードを一括取得（プレイリスト情報も含める）
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
				playlists: {
					select: {
						playlist: {
							select: {
								id: true,
								name: true,
								path: true,
							},
						},
					},
				},
			},
		});
		const existingIdByPath = new Map(
			existingRecords.map((record) => [record.filePath, record.id]),
		);

		const existingRecordMap = new Map(
			existingRecords.map((record) => {
				// 最初のプレイリスト情報を取得（複数ある場合は最初のものを使用）
				const firstPlaylist =
					record.playlists.length > 0 ? record.playlists[0] : null;
				return [
					record.filePath,
					{
						...record,
						fileSize: Number(record.fileSize), // BigIntをnumberに変換
						thumbnailPath: record.thumbnail_path,
						playlistId: firstPlaylist?.playlist.id,
						playlistName: firstPlaylist?.playlist.name,
					} as ProcessedVideoRecord,
				];
			}),
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
			existingIdByPath,
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
		const {
			changedFiles,
			unchangedFiles,
			newFiles,
			unchangedRecords,
			existingIdByPath,
		} = await this.detectFileChanges(allVideoFiles);

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
					existingIdByPath,
				);
			} else {
				processedDbRecords = await this.performParallelProcessing(
					changedFiles,
					scanId,
					existingIdByPath,
				);
			}
		}

		// Phase 2.2: 未変更ファイルにもプレイリストを割り当て
		if (unchangedFiles.length > 0) {
			const playlistUpdatedRecords = await this.updatePlaylistForUnchangedFiles(
				unchangedFiles,
				unchangedRecords,
			);
			// unchangedRecordsを更新済みのレコードに置き換え
			unchangedRecords.splice(
				0,
				unchangedRecords.length,
				...playlistUpdatedRecords,
			);
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

	/**
	 * 未変更ファイルのプレイリスト割り当てを更新
	 */
	private async updatePlaylistForUnchangedFiles(
		unchangedFiles: VideoFile[],
		unchangedRecords: ProcessedVideoRecord[],
	): Promise<ProcessedVideoRecord[]> {
		const updatedRecords: ProcessedVideoRecord[] = [];

		for (let i = 0; i < unchangedFiles.length; i++) {
			const videoFile = unchangedFiles[i];
			const existingRecord = unchangedRecords[i];

			// プレイリストの割り当て
			const playlist = this.playlistDetector.assignPlaylist(
				videoFile.filePath,
				this.detectedPlaylists,
			);

			// プレイリスト情報のみ更新
			updatedRecords.push({
				...existingRecord,
				playlistId: playlist?.id,
				playlistName: playlist?.name,
			});
		}

		return updatedRecords;
	}

	private async performParallelProcessing(
		allVideoFiles: VideoFile[],
		scanId: string,
		existingIdByPath: Map<string, string>,
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
			message:
				this.scanSettings.scanMode === "lightweight"
					? "軽量メタデータ処理中..."
					: "メタデータとサムネイル処理中...",
		});

		const totalFiles = allVideoFiles.length;
		let processedCount = 0;

		const broadcastMetadataProgress = (file: VideoFile) => {
			if (totalFiles === 0) {
				return;
			}
			const updateInterval = Math.max(
				1,
				this.scanSettings.progressUpdateInterval,
			);
			if (
				processedCount % updateInterval !== 0 &&
				processedCount !== totalFiles
			) {
				return;
			}

			const progressMetrics = this.progressCalculator.calculateProgressMetrics(
				processedCount,
				totalFiles,
			);
			const progressValue = (processedCount / totalFiles) * 50;

			sseStore.broadcast({
				type: "progress",
				scanId,
				phase: "metadata",
				progress: progressValue,
				processedFiles: processedCount,
				totalFiles,
				currentFile: file.fileName,
				message: `メタデータ処理中 (${processedCount}/${totalFiles}) - ${file.fileName}`,
				processingSpeed: progressMetrics.processingSpeed,
				estimatedTimeRemaining: progressMetrics.estimatedTimeRemaining,
				phaseStartTime: this.progressCalculator.currentPhaseStartTime
					? new Date(
							this.progressCalculator.currentPhaseStartTime,
						).toISOString()
					: undefined,
				totalElapsedTime: progressMetrics.totalElapsedTime,
				currentPhaseElapsed: progressMetrics.currentPhaseElapsed,
			});
		};

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

				let fileSize: number;
				let lastModified: Date;
				let duration: number | null;
				let extractedMetadata: Awaited<
					ReturnType<FFprobeMetadataExtractor["extractMetadata"]>
				> | null = null;

				if (this.scanSettings.scanMode === "lightweight") {
					const stat = await fs.stat(videoFile.filePath);
					fileSize = stat.size;
					lastModified = stat.mtime;
					duration = null;
				} else {
					extractedMetadata = await this.ffprobeExtractor.extractMetadata(
						videoFile.filePath,
					);
					fileSize = extractedMetadata.fileSize;
					lastModified = extractedMetadata.lastModified;
					duration = extractedMetadata.duration;
				}
				const parsedInfo = parseVideoFileName(videoFile.fileName);
				const recordId =
					existingIdByPath.get(videoFile.filePath) ?? randomUUID();

				// サムネイル生成（既に取得したメタデータを使用）
				let thumbnailPath: string | null = null;
				if (this.scanSettings.scanMode !== "lightweight" && extractedMetadata) {
					try {
						const thumbnailResult =
							await this.thumbnailGenerator.generateThumbnail(
								videoFile.filePath,
								recordId,
								extractedMetadata,
							);
						if (thumbnailResult.success) {
							thumbnailPath = thumbnailResult.relativePath;
						}
					} catch (error) {
						console.warn(`サムネイル生成失敗 ${videoFile.filePath}:`, error);
					}
				}

				// プレイリストの割り当て
				const playlist = this.playlistDetector.assignPlaylist(
					videoFile.filePath,
					this.detectedPlaylists,
				);

				records.push({
					id: recordId,
					filePath: videoFile.filePath,
					fileName: videoFile.fileName,
					title: parsedInfo.cleanTitle,
					fileSize,
					episode: this.extractEpisode(videoFile.fileName) ?? null,
					year: parsedInfo.broadcastDate?.getFullYear() ?? null,
					duration,
					thumbnailPath,
					lastModified,
					playlistId: playlist?.id,
					playlistName: playlist?.name,
				});

				processedCount++;
				broadcastMetadataProgress(videoFile);
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

		const { uniqueRecords, duplicateGroups } =
			this.deduplicateVideoRecords(allDbRecords);

		if (duplicateGroups.length > 0) {
			console.warn(
				`[SCAN][database] Detected ${duplicateGroups.length} duplicate filePath entries. Keeping the most recently modified file.`,
			);
			for (const group of duplicateGroups) {
				const skipped = group.skipped
					.map((record) => record.filePath)
					.join(", ");
				console.warn(
					`[SCAN][database] filePath=${group.filePath} kept=${group.kept.filePath} skipped=[${skipped}]`,
				);
			}
		}

		sseStore.broadcast({
			type: "phase",
			scanId,
			phase: "database",
			progress: 0,
			processedFiles: uniqueRecords.length,
			totalFiles: uniqueRecords.length,
			message: "データベース更新中...",
		});

		const existingRecords = await prisma.videoMetadata.findMany({
			select: { filePath: true, id: true },
		});
		const existingFilePaths = new Set(existingRecords.map((r) => r.filePath));
		const existingFileToId = new Map(
			existingRecords.map((record) => [record.filePath, record.id]),
		);
		const currentFilePaths = new Set(uniqueRecords.map((r) => r.filePath));
		const deletedFilePaths = [...existingFilePaths].filter(
			(path) => !currentFilePaths.has(path),
		);

		const deletedIds = deletedFilePaths
			.map((path) => existingFileToId.get(path))
			.filter((id): id is string => Boolean(id));

		if (deletedFilePaths.length > 0) {
			await prisma.videoMetadata.deleteMany({
				where: {
					filePath: { in: deletedFilePaths },
				},
			});
		}

		const dbBatchSize = Math.max(1, this.scanSettings.batchSize);
		const recordChunks = this.chunkRecords(uniqueRecords, dbBatchSize);
		let processedDbCount = 0;

		for (const chunk of recordChunks) {
			await prisma.$transaction(
				async (tx: Prisma.TransactionClient) => {
					for (const record of chunk) {
						await tx.videoMetadata.upsert({
							where: { filePath: record.filePath },
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
							},
						});

						if (record.playlistId) {
							const existingRelation = await tx.videoPlaylist.findFirst({
								where: {
									videoMetadataId: record.id,
									playlistId: record.playlistId,
								},
							});

							if (!existingRelation) {
								await tx.videoPlaylist.create({
									data: {
										videoMetadataId: record.id,
										playlistId: record.playlistId,
									},
								});
							}
						}

						await tx.videoPlaylist.deleteMany({
							where: {
								videoMetadataId: record.id,
								playlistId: record.playlistId
									? {
											not: record.playlistId,
										}
									: undefined,
							},
						});
					}
				},
				{ timeout: SCAN.TRANSACTION_TIMEOUT_MS },
			);

			processedDbCount += chunk.length;
			this.broadcastDatabaseProgress(
				scanId,
				processedDbCount,
				uniqueRecords.length,
				chunk[chunk.length - 1]?.fileName,
			);
		}

		const activeIds = new Set(uniqueRecords.map((record) => record.id));
		const orphanThumbnailIds = deletedIds.filter((id) => !activeIds.has(id));
		for (const id of orphanThumbnailIds) {
			await this.thumbnailGenerator.deleteThumbnailById(id);
		}

		sseStore.broadcast({
			type: "complete",
			scanId,
			phase: "database",
			progress: 100,
			processedFiles: uniqueRecords.length,
			totalFiles: uniqueRecords.length,
			message: `スキャン完了: ${uniqueRecords.length}ファイル処理完了`,
		});

		return deletedFilePaths.length;
	}

	private deduplicateVideoRecords(records: ProcessedVideoRecord[]): {
		uniqueRecords: ProcessedVideoRecord[];
		duplicateGroups: Array<{
			filePath: string;
			kept: ProcessedVideoRecord;
			skipped: ProcessedVideoRecord[];
		}>;
	} {
		const recordMap = new Map<string, ProcessedVideoRecord>();
		const duplicates: Array<{
			filePath: string;
			kept: ProcessedVideoRecord;
			skipped: ProcessedVideoRecord[];
		}> = [];

		for (const record of records) {
			const key = record.filePath;
			const existing = recordMap.get(key);

			if (!existing) {
				recordMap.set(key, record);
				continue;
			}

			const shouldReplace =
				record.lastModified.getTime() > existing.lastModified.getTime();
			const keptRecord = shouldReplace ? record : existing;
			const skippedRecord = shouldReplace ? existing : record;

			if (shouldReplace) {
				recordMap.set(key, record);
			}

			const duplicateEntry = duplicates.find((entry) => entry.filePath === key);
			if (duplicateEntry) {
				duplicateEntry.kept = keptRecord;
				duplicateEntry.skipped.push(skippedRecord);
			} else {
				duplicates.push({
					filePath: key,
					kept: keptRecord,
					skipped: [skippedRecord],
				});
			}
		}

		return {
			uniqueRecords: Array.from(recordMap.values()),
			duplicateGroups: duplicates,
		};
	}

	private chunkRecords<T>(records: T[], chunkSize: number): T[][] {
		if (chunkSize <= 0) {
			return [records];
		}

		const chunks: T[][] = [];
		for (let i = 0; i < records.length; i += chunkSize) {
			chunks.push(records.slice(i, i + chunkSize));
		}
		return chunks;
	}

	private broadcastDatabaseProgress(
		scanId: string,
		processed: number,
		total: number,
		currentFile?: string,
	): void {
		const normalizedProgress =
			total > 0 ? Math.min(50 + (processed / total) * 50, 99.9) : 50;

		sseStore.broadcast({
			type: "progress",
			scanId,
			phase: "database",
			progress: normalizedProgress,
			processedFiles: processed,
			totalFiles: total,
			currentFile,
			message: `データベース更新中 (${processed}/${total})`,
		});
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
				} catch {}
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
		// 検出済みのプレイリスト情報を維持して初期化
		this.initializeStreamProcessorWithPlaylists(this.detectedPlaylists);
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

	async initializeSchedulerIfNeeded(): Promise<void> {
		if (typeof window === "undefined" && !this.schedulerInitialized) {
			await this.getScheduler().initializeFromDatabase();
			this.schedulerInitialized = true;
		}
	}

	private async executeScheduledScan(): Promise<void> {
		if (this.isUpdating) {
			return;
		}

		try {
			await this.manualRefresh();
		} catch (error) {
			console.error("スケジュールされたスキャンでエラー:", error);
			throw error;
		}
	}
}

export const videoCacheService = VideoCacheService.getInstance();
