import { Injectable, Logger } from "@nestjs/common";
import { CronJob } from "cron";
import type {
	ScanScheduleSettings,
	SchedulerStatus,
} from "../../../../../shared/types/scan-schedule-settings";

/**
 * デフォルトスケジュール設定
 */
const DEFAULT_SCHEDULE_SETTINGS: ScanScheduleSettings = {
	// 基本設定（週次、日曜3時実行）
	enabled: false,
	interval: "weekly",
	intervalHours: 168, // 週1回

	// 実行タイミング（日曜3:00）
	executionTime: {
		hour: 3,
		minute: 0,
	},

	// 曜日指定（日曜）
	weeklyDays: [0],

	// 月次指定
	monthlyDay: 1,

	// 制御設定
	skipIfRunning: true,
	maxExecutionTimeMinutes: 120,
	onlyWhenIdle: false,
};

@Injectable()
export class ScanSchedulerService {
	private readonly logger = new Logger(ScanSchedulerService.name);
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

	/**
	 * スキャン実行関数を設定
	 */
	setScanExecutor(executor: () => Promise<void>): void {
		this.scanExecutor = executor;
	}

	/**
	 * 手動スキャン状態チェック関数を設定
	 */
	setManualScanChecker(checker: () => boolean): void {
		this.manualScanChecker = checker;
	}

	/**
	 * スケジューラーを開始
	 */
	async start(): Promise<void> {
		if (this.cronJob) {
			this.logger.log("スケジューラーは既に開始されています");
			return;
		}

		if (!this.settings.enabled) {
			this.logger.log("スケジュールが無効化されているため開始しません");
			return;
		}

		const cronPattern = this.generateCronPattern();
		this.logger.log(`スキャンスケジューラーを開始: ${cronPattern}`);

		this.cronJob = new CronJob(
			cronPattern,
			() => {
				this.executeScheduledScan().catch((error) => {
					this.logger.error("スケジュール実行でエラー:", error);
				});
			},
			null,
			false, // 自動開始しない
			"Asia/Tokyo", // 日本時間
		);

		this.cronJob.start();
	}

	/**
	 * スケジューラーを停止
	 */
	async stop(): Promise<void> {
		if (this.cronJob) {
			this.cronJob.stop();
			this.cronJob = null;
			this.logger.log("スキャンスケジューラーを停止しました");
		}
	}

	/**
	 * スケジューラーを再起動
	 */
	async restart(): Promise<void> {
		await this.stop();
		if (this.settings.enabled) {
			await this.start();
		}
	}

	/**
	 * スケジュール設定を更新
	 */
	async updateSettings(newSettings: ScanScheduleSettings): Promise<void> {
		const wasEnabled = this.settings.enabled;
		this.settings = { ...newSettings };

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

		this.logger.log("スケジュール設定を更新しました:", {
			enabled: this.settings.enabled,
			interval: this.settings.interval,
			cronPattern: this.settings.enabled ? this.generateCronPattern() : null,
		});
	}

	/**
	 * スケジューラーを必要な時だけ初期化
	 */
	async initializeSchedulerIfNeeded(): Promise<void> {
		if (typeof window === "undefined" && !this.cronJob) {
			this.logger.log(
				"🚀 ScanSchedulerService: スケジューラーを遅延初期化します",
			);
			try {
				await this.initializeFromDatabase();
				this.logger.log("✅ スケジューラーの遅延初期化が完了しました");
			} catch (error) {
				this.logger.error("❌ スケジューラー初期化エラー:", error);
			}
		}
	}

	/**
	 * DBから設定を読み込んで初期化
	 */
	async initializeFromDatabase(): Promise<void> {
		// 多重初期化を防止
		if (this.cronJob) {
			this.logger.log("スケジューラーは既に初期化済みです（cronJobが存在）");
			return;
		}

		this.logger.log("DBからスケジュール設定を読み込み中...");

		// デフォルト設定を使用
		const loadedSettings = DEFAULT_SCHEDULE_SETTINGS;

		this.logger.log("DBから読み込んだ設定:", {
			enabled: loadedSettings.enabled,
			interval: loadedSettings.interval,
			executionTime: loadedSettings.executionTime,
		});

		this.settings = loadedSettings;

		// 設定が有効な場合はスケジューラーを開始
		if (this.settings.enabled) {
			this.logger.log("スケジューラーを開始します...");
			await this.start();
		} else {
			this.logger.log("スケジュールは無効です");
		}

		this.logger.log("スケジュール設定の初期化が完了しました:", {
			enabled: this.settings.enabled,
			interval: this.settings.interval,
		});
	}

	/**
	 * 現在の設定をDBから再読み込み
	 */
	async loadSettingsFromDatabase(): Promise<ScanScheduleSettings> {
		try {
			return this.settings;
		} catch (error) {
			this.logger.error("設定の読み込みでエラー:", error);
			return this.settings; // 既存設定を返す
		}
	}

	/**
	 * 現在のスケジューラー状態を取得
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
	 * スケジュールされたスキャン実行
	 */
	private async executeScheduledScan(): Promise<void> {
		this.logger.log("スケジュールされたスキャンを実行中...");

		// 手動スキャンが実行中の場合はスキップ
		if (this.manualScanChecker?.()) {
			this.logger.log(
				"手動スキャンが実行中のため、スケジュールされたスキャンをスキップ",
			);
			return;
		}

		this.currentExecutionStartTime = new Date();
		this.isRunning = true;

		try {
			// 通常のスキャン実行
			if (this.scanExecutor) {
				await this.scanExecutor();
			}

			this.lastExecution = this.currentExecutionStartTime;
			this.lastExecutionStatus = "completed";
			this.logger.log("スケジュールされたスキャン完了");
		} catch (error) {
			this.lastExecution = this.currentExecutionStartTime;
			this.lastExecutionStatus = "failed";
			this.logger.error("スケジュールされたスキャンでエラー:", error);
			throw error;
		} finally {
			this.currentExecutionStartTime = null;
			this.isRunning = false;
		}
	}
}
