/**
 * スキャンスケジューラー（Cronライブラリ版）
 * cronライブラリを使用した定期的なビデオスキャンの自動実行を管理
 */
import { CronJob } from "cron";
import {
	type ScanScheduleSettings,
	type SchedulerStatus,
	DEFAULT_SCHEDULE_SETTINGS,
} from "../types/scanScheduleSettings";
import { ScanSchedulePersistenceService } from "./ScanSchedulePersistenceService";
import type { ScanProgressEvent } from "src/common/sse/sse-connection.store";
import { sseStore } from "src/common/sse/sse-connection.store";

/**
 * スケジューラーサービス
 */
// Next.js環境でのグローバルインスタンス管理
declare global {
	var __scanScheduler: ScanScheduler | undefined;
}

export class ScanScheduler {
	private cronJob: CronJob | null = null;
	private settings: ScanScheduleSettings = DEFAULT_SCHEDULE_SETTINGS;
	private isRunning = false;
	private lastExecution: Date | null = null;
	private lastExecutionStatus:
		| "completed"
		| "failed"
		| "cancelled"
		| "timeout"
		| null = null;
	private currentExecutionStartTime: Date | null = null;

	// スキャン実行関数（外部から注入）
	private scanExecutor: (() => Promise<void>) | null = null;

	// 手動スキャン状態チェック関数（外部から注入）
	private manualScanChecker: (() => boolean) | null = null;

	// DB永続化サービス
	private persistenceService: ScanSchedulePersistenceService;

	private constructor() {
		this.persistenceService = new ScanSchedulePersistenceService();
	}

	/**
	 * グローバルインスタンスを取得（シングルトン）
	 */
	static getInstance(): ScanScheduler {
		if (!globalThis.__scanScheduler) {
			globalThis.__scanScheduler = new ScanScheduler();
		}
		return globalThis.__scanScheduler;
	}

	/**
	 * スケジューラーを開始（Cronライブラリ版）
	 */
	async start(): Promise<void> {
		if (this.cronJob) {
			console.log("スケジューラーは既に開始されています");
			return;
		}

		if (!this.settings.enabled) {
			console.log("スケジュールが無効化されているため開始しません");
			return;
		}

		const cronPattern = this.generateCronPattern();
		console.log(`スキャンスケジューラーを開始: ${cronPattern}`);

		this.cronJob = new CronJob(
			cronPattern,
			() => {
				this.executeScheduledScan().catch((error) => {
					console.error("スケジュール実行でエラー:", error);
				});
			},
			null,
			false, // 自動開始しない
			"Asia/Tokyo", // 日本時間
		);

		this.cronJob.start();
	}

	/**
	 * スケジューラーを停止（Cronライブラリ版）
	 */
	async stop(): Promise<void> {
		if (this.cronJob) {
			this.cronJob.stop();
			this.cronJob = null;
			console.log("スキャンスケジューラーを停止しました");
		}
	}

	/**
	 * スケジューラーを再起動（設定変更時・Cronライブラリ版）
	 */
	async restart(): Promise<void> {
		await this.stop();
		if (this.settings.enabled) {
			await this.start();
		}
	}

	/**
	 * スケジュール設定を更新（Cronライブラリ版）
	 */
	async updateSettings(newSettings: ScanScheduleSettings): Promise<void> {
		const wasEnabled = this.settings.enabled;
		this.settings = { ...newSettings };

		try {
			// DBに設定を保存
			await this.persistenceService.saveSettings(this.settings);
		} catch (error) {
			console.error("設定のDB保存に失敗しました:", error);
			// DB保存に失敗してもメモリ上の設定更新は継続
		}

		// スケジューラーの状態を調整
		if (this.settings.enabled && !wasEnabled) {
			// 無効→有効: スケジューラー開始
			await this.start();
		} else if (!this.settings.enabled && wasEnabled) {
			// 有効→無効: スケジューラー停止
			await this.stop();
		} else if (this.settings.enabled && wasEnabled) {
			// 有効→有効（設定変更）: 再起動
			await this.restart();
		}

		console.log("スケジュール設定を更新しました:", {
			enabled: this.settings.enabled,
			interval: this.settings.interval,
			cronPattern: this.settings.enabled ? this.generateCronPattern() : null,
		});
	}

	/**
	 * DBから設定を読み込んで初期化
	 */
	async initializeFromDatabase(): Promise<void> {
		// 多重初期化を防止（実際のcronJobの有無でチェック）
		if (this.cronJob) {
			console.log("スケジューラーは既に初期化済みです（cronJobが存在）");
			return;
		}

		// ビルド時は初期化をスキップ
		const isBuildTime =
			process.env.NEXT_PHASE === "phase-production-build" ||
			process.env.NEXT_PHASE === "PHASE_PRODUCTION_BUILD";

		if (isBuildTime) {
			console.log("ビルド時はスケジューラー初期化をスキップします");
			return;
		}

		console.log("DBからスケジュール設定を読み込み中...");
		const loadedSettings = await this.persistenceService.loadSettings();

		console.log("DBから読み込んだ設定:", {
			enabled: loadedSettings.enabled,
			interval: loadedSettings.interval,
			executionTime: loadedSettings.executionTime,
		});

		this.settings = loadedSettings;

		// 設定が有効な場合はスケジューラーを開始
		if (this.settings.enabled) {
			console.log("スケジューラーを開始します...");
			await this.start();
		} else {
			console.log("スケジュールは無効です");
		}

		console.log("スケジュール設定の初期化が完了しました:", {
			enabled: this.settings.enabled,
			interval: this.settings.interval,
		});
	}

	/**
	 * 現在の設定をDBから再読み込み
	 */
	async loadSettingsFromDatabase(): Promise<ScanScheduleSettings> {
		try {
			this.settings = await this.persistenceService.loadSettings();
			return this.settings;
		} catch (error) {
			console.error("設定の読み込みでエラー:", error);
			return this.settings; // 既存設定を返す
		}
	}

	/**
	 * スキャン実行関数を設定（依存性注入）
	 */
	setScanExecutor(executor: () => Promise<void>): void {
		this.scanExecutor = executor;
	}

	/**
	 * 現在のスケジューラー状態を取得（Cronライブラリ版）
	 */
	getStatus(): SchedulerStatus {
		return {
			isEnabled: this.settings.enabled,
			isRunning: this.isRunning,
			nextExecution: this.cronJob?.nextDate()?.toJSDate() || null,
			lastExecution: this.lastExecution,
			lastExecutionStatus: this.lastExecutionStatus,
			currentExecutionStartTime: this.currentExecutionStartTime,
		};
	}

	/**
	 * 現在の設定を取得
	 */
	getSettings(): ScanScheduleSettings {
		return { ...this.settings };
	}

	/**
	 * UI設定からcronパターンを生成
	 */
	private generateCronPattern(): string {
		const { hour, minute } = this.settings.executionTime;

		switch (this.settings.interval) {
			case "daily":
				return `${minute} ${hour} * * *`;

			case "weekly": {
				if (this.settings.weeklyDays.length === 0) {
					return `${minute} ${hour} * * 0`; // デフォルト: 日曜日
				}
				const days = this.settings.weeklyDays.join(",");
				return `${minute} ${hour} * * ${days}`;
			}

			case "monthly":
				return `${minute} ${hour} ${this.settings.monthlyDay} * *`;

			case "custom":
				// カスタム間隔: N時間ごと
				return `${minute} */${this.settings.intervalHours} * * *`;

			default:
				// フォールバック: 毎日
				return `${minute} ${hour} * * *`;
		}
	}

	/**
	 * スケジュールされたスキャンを実行（Cronライブラリ版）
	 */
	private async executeScheduledScan(): Promise<void> {
		if (!this.scanExecutor) {
			console.error("スキャン実行関数が設定されていません");
			return;
		}

		// 手動実行中の場合はスキップ
		if (this.settings.skipIfRunning && this.isManualScanRunning()) {
			console.log(
				"手動スキャンが実行中のため、スケジュールされたスキャンをスキップしました",
			);
			return;
		}

		console.log("スケジュールされたスキャンを開始します");
		this.isRunning = true;
		this.currentExecutionStartTime = new Date();

		// SSEでスケジュール実行開始を通知
		const startEvent: ScanProgressEvent = {
			type: "scheduler_status",
			message: "スケジュールされたスキャンを開始しました",
			timestamp: this.currentExecutionStartTime.toISOString(),
		};
		sseStore.broadcast(startEvent);

		try {
			// スキャン実行
			await this.scanExecutor();

			// 成功
			this.lastExecution = this.currentExecutionStartTime;
			this.lastExecutionStatus = "completed";
			console.log("スケジュールされたスキャンが完了しました");

			// SSEで完了通知
			const completeEvent: ScanProgressEvent = {
				type: "scheduler_status",
				message: "スケジュールされたスキャンが完了しました",
				timestamp: new Date().toISOString(),
			};
			sseStore.broadcast(completeEvent);
		} catch (error) {
			// エラー
			this.lastExecution = this.currentExecutionStartTime;
			this.lastExecutionStatus = "failed";
			console.error("スケジュールされたスキャンでエラーが発生:", error);

			// SSEでエラー通知
			const errorEvent: ScanProgressEvent = {
				type: "scheduler_status",
				message: "スケジュールされたスキャンでエラーが発生しました",
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString(),
			};
			sseStore.broadcast(errorEvent);
		} finally {
			this.isRunning = false;
			this.currentExecutionStartTime = null;
		}
	}

	/**
	 * 実行タイムアウトをチェック（手動で呼び出し可能）
	 */
	checkExecutionTimeout(): void {
		if (!this.currentExecutionStartTime) {
			return;
		}

		const now = new Date();
		const executionTime =
			now.getTime() - this.currentExecutionStartTime.getTime();
		const timeoutMs = this.settings.maxExecutionTimeMinutes * 60 * 1000;

		if (executionTime > timeoutMs) {
			console.warn(
				`スケジュール実行がタイムアウトしました（${this.settings.maxExecutionTimeMinutes}分）`,
			);

			this.isRunning = false;
			this.lastExecution = this.currentExecutionStartTime;
			this.lastExecutionStatus = "timeout";
			this.currentExecutionStartTime = null;

			// SSEでタイムアウト通知
			const timeoutEvent: ScanProgressEvent = {
				type: "scheduler_status",
				message: "スケジュールされたスキャンがタイムアウトしました",
				timestamp: new Date().toISOString(),
			};
			sseStore.broadcast(timeoutEvent);
		}
	}

	/**
	 * 手動スキャンが実行中かどうかを確認
	 * （実際の実装は外部のVideoCacheServiceの状態をチェック）
	 */
	private isManualScanRunning(): boolean {
		// VideoCacheServiceから注入される関数で判定
		if (this.manualScanChecker) {
			return this.manualScanChecker();
		}
		return false;
	}

	/**
	 * 手動スキャン状態チェック関数を設定
	 */
	setManualScanChecker(checker: () => boolean): void {
		this.manualScanChecker = checker;
	}
}
