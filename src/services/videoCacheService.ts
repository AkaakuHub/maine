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

	constructor() {
		this.initializePromise = this.initialize();
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

		try {
			const videoDirectories = getVideoDirectories();
			let totalFiles = 0;
			let processedFiles = 0;

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

			// ファイル情報をDBレコード形式に変換（メモリ上で処理）
			for (let i = 0; i < allVideoFiles.length; i++) {
				const videoFile = allVideoFiles[i];

				try {
					// 既存のパーサーを使用して情報抽出
					const parsedInfo = parseVideoFileName(videoFile.fileName);

					// DBレコードとして準備
					allDbRecords.push({
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

					// プログレス更新（準備フェーズとして50%まで）
					if (allVideoFiles.length > 0) {
						this.updateProgress = Math.floor(
							(processedFiles / allVideoFiles.length) * 50,
						);
					}

					// 軽い休憩（CPUを労る）
					if (i % 100 === 0 && i > 0) {
						await this.sleep(1);
					}
				} catch (fileError) {
					console.warn(`ファイル処理エラー: ${videoFile.fileName}`, fileError);
				}
			}

			totalFiles = allDbRecords.length;
			console.log(`メタデータ準備完了: ${totalFiles}レコード`);

			// 🔒 重要: トランザクション内でDBを安全に更新
			console.log("データベース更新開始（トランザクション内）...");
			await prisma.$transaction(
				async (tx) => {
					// 1. 既存データを削除
					await tx.videoMetadata.deleteMany({});
					console.log("既存データクリア完了");

					// 2. バッチインサート（50件ずつの適切なサイズで処理）
					const BATCH_SIZE = 50;
					for (let i = 0; i < allDbRecords.length; i += BATCH_SIZE) {
						const batch = allDbRecords.slice(i, i + BATCH_SIZE);

						await tx.videoMetadata.createMany({
							data: batch,
						});

						// プログレス更新（50%〜100%）
						const dbProgress = Math.floor(
							((i + batch.length) / allDbRecords.length) * 50,
						);
						this.updateProgress = 50 + dbProgress;

						console.log(
							`DBバッチ保存: ${i + batch.length}/${allDbRecords.length}`,
						);
					}

					console.log("全データベース保存完了");
				},
				{
					// トランザクションタイムアウト: 10分（大量ファイル対応）
					timeout: 600000,
				},
			);

			this.lastFullScanTime = new Date();
			this.updateProgress = 100;
			console.log(
				`フルDBキャッシュ構築完了: ${totalFiles}ファイル（メモリ使用: 数KB）`,
			);
		} catch (error) {
			// 🚨 エラーハンドリング強化
			console.error("フルキャッシュ構築中にエラーが発生:", error);

			// トランザクション外でエラーが発生した場合の処理
			if (error instanceof Error) {
				console.error("エラー詳細:", {
					message: error.message,
					stack: error.stack,
				});
			}

			// プログレス状態をエラー状態にリセット
			this.updateProgress = -1; // エラー状態を示す特殊値

			// エラー情報を永続化
			await this.saveScanSettings();

			// エラーを再度投げて上位に伝達
			throw new Error(
				`ビデオスキャン処理が失敗しました: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			// 🔒 確実にクリーンアップ
			this.isUpdating = false;

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

	private extractEpisode(fileName: string): number | undefined {
		const episodeMatch = fileName.match(/(?:ep?|episode|第)[\s]*(\d+)/i);
		return episodeMatch ? Number.parseInt(episodeMatch[1], 10) : undefined;
	}
}

// シングルトンインスタンス
export const videoCacheService = new VideoCacheService();
