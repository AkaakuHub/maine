import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	BadRequestException,
	Logger,
	Inject,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { ScanSchedulerService } from "../scan/scan-scheduler.service";
import type { ScanScheduleSettings } from "../../../../../shared/types/scan-schedule-settings";

interface ValidationResult {
	isValid: boolean;
	error?: string;
}

interface ScheduleConstraints {
	intervalHours: { min: number; max: number };
	executionTime: {
		hour: { min: number; max: number };
		minute: { min: number; max: number };
	};
	weeklyDays: { min: number; max: number };
	monthlyDay: { min: number; max: number };
	maxExecutionTimeMinutes: { min: number; max: number };
}

const SCHEDULE_SETTINGS_CONSTRAINTS: ScheduleConstraints = {
	intervalHours: { min: 1, max: 168 }, // 1時間から1週間
	executionTime: {
		hour: { min: 0, max: 23 },
		minute: { min: 0, max: 59 },
	},
	weeklyDays: { min: 0, max: 6 }, // 日曜日=0, 土曜日=6
	monthlyDay: { min: 1, max: 31 },
	maxExecutionTimeMinutes: { min: 5, max: 1440 }, // 5分から24時間
};

@ApiTags("schedule")
@Controller("scan/schedule")
export class ScheduleController {
	private readonly logger = new Logger(ScheduleController.name);

	constructor(
		@Inject(ScanSchedulerService) private readonly scanScheduler: ScanSchedulerService,
	) {}

	@Get()
	@ApiResponse({ status: 200, description: "スケジュール設定取得" })
	async getScheduleSettings() {
		try {
			this.logger.log("Getting schedule settings");

			// スケジューラーの遅延初期化を確実に実行
			await this.scanScheduler.initializeSchedulerIfNeeded();

			// DBから最新設定を確実に読み込み（Next.jsと同じ動作）
			try {
				await this.scanScheduler.loadSettingsFromDatabase();
			} catch (dbError) {
				this.logger.warn("DB設定読み込み中にエラー（メモリ上の設定を使用）:", dbError);
			}

			const settings = this.scanScheduler.getSettings();
			const status = this.scanScheduler.getStatus();

			this.logger.log("Schedule settings retrieved:", { settings, status });

			return {
				success: true,
				settings,
				status,
			};
		} catch (error) {
			this.logger.error("Get schedule settings error:", error);
			return {
				success: false,
				error: "スケジュール設定の取得に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	@Post()
	@ApiResponse({ status: 200, description: "スケジュール設定保存" })
	@ApiResponse({ status: 400, description: "無効な設定" })
	async saveScheduleSettings(@Body() settings: ScanScheduleSettings) {
		try {
			this.logger.log("Saving schedule settings");

			// 設定の検証
			const validationResult = this.validateScheduleSettings(settings);
			if (!validationResult.isValid) {
				throw new BadRequestException(validationResult.error);
			}

			// スケジューラー設定を更新
			await this.scanScheduler.updateSettings(settings);
			this.logger.log("Schedule settings saved:", settings);

			// 更新後の設定と状態を取得
			const updatedSettings = this.scanScheduler.getSettings();
			const status = this.scanScheduler.getStatus();

			return {
				success: true,
				message: "スケジュール設定を保存しました",
				settings: updatedSettings,
				status,
			};
		} catch (error) {
			this.logger.error("Save schedule settings error:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			return {
				success: false,
				error: "スケジュール設定の保存に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	@Delete()
	@ApiResponse({ status: 200, description: "スケジュール無効化" })
	async disableSchedule() {
		try {
			this.logger.log("Disabling schedule");

			// スケジューラーを無効化
			const currentSettings = this.scanScheduler.getSettings();
			const disabledSettings: ScanScheduleSettings = {
				...currentSettings,
				enabled: false,
			};

			await this.scanScheduler.updateSettings(disabledSettings);
			this.logger.log("Schedule disabled");

			// 無効化後の設定と状態を取得
			const updatedSettings = this.scanScheduler.getSettings();
			const status = this.scanScheduler.getStatus();

			return {
				success: true,
				message: "スケジュールを無効化しました",
				settings: updatedSettings,
				status,
			};
		} catch (error) {
			this.logger.error("Disable schedule error:", error);
			return {
				success: false,
				error: "スケジュールの無効化に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * スケジュール設定のバリデーション
	 */
	private validateScheduleSettings(settings: unknown): ValidationResult {
		// 基本型チェック
		if (typeof settings !== "object" || settings === null) {
			return {
				isValid: false,
				error: "設定が正しいオブジェクト形式ではありません",
			};
		}

		// Record型にキャスト
		const settingsObj = settings as Record<string, unknown>;

		// enabled チェック
		if (typeof settingsObj.enabled !== "boolean") {
			return {
				isValid: false,
				error: "enabled は boolean 型である必要があります",
			};
		}

		// interval チェック
		const validIntervals = ["daily", "weekly", "monthly", "custom"];
		if (!validIntervals.includes(settingsObj.interval as string)) {
			return {
				isValid: false,
				error:
					"interval は daily, weekly, monthly, custom のいずれかである必要があります",
			};
		}

		// intervalHours チェック
		if (
			typeof settingsObj.intervalHours !== "number" ||
			settingsObj.intervalHours <
				SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.min ||
			settingsObj.intervalHours > SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.max
		) {
			return {
				isValid: false,
				error: `intervalHours は ${SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.min} から ${SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.max} の間である必要があります`,
			};
		}

		// executionTime チェック
		if (
			!settingsObj.executionTime ||
			typeof settingsObj.executionTime !== "object" ||
			settingsObj.executionTime === null
		) {
			return {
				isValid: false,
				error:
					"executionTime は hour と minute を含むオブジェクトである必要があります",
			};
		}

		const executionTime = settingsObj.executionTime as Record<string, unknown>;
		if (
			typeof executionTime.hour !== "number" ||
			typeof executionTime.minute !== "number"
		) {
			return {
				isValid: false,
				error:
					"executionTime は hour と minute を含むオブジェクトである必要があります",
			};
		}

		const { hour, minute } = executionTime;
		if (
			hour < SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.hour.min ||
			hour > SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.hour.max
		) {
			return {
				isValid: false,
				error: "hour は 0 から 23 の間である必要があります",
			};
		}

		if (
			minute < SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.minute.min ||
			minute > SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.minute.max
		) {
			return {
				isValid: false,
				error: "minute は 0 から 59 の間である必要があります",
			};
		}

		// weeklyDays チェック
		if (!Array.isArray(settingsObj.weeklyDays)) {
			return { isValid: false, error: "weeklyDays は配列である必要があります" };
		}

		for (const day of settingsObj.weeklyDays) {
			if (
				typeof day !== "number" ||
				day < SCHEDULE_SETTINGS_CONSTRAINTS.weeklyDays.min ||
				day > SCHEDULE_SETTINGS_CONSTRAINTS.weeklyDays.max
			) {
				return {
					isValid: false,
					error: "weeklyDays の各要素は 0 から 6 の数値である必要があります",
				};
			}
		}

		// monthlyDay チェック
		if (
			typeof settingsObj.monthlyDay !== "number" ||
			settingsObj.monthlyDay < SCHEDULE_SETTINGS_CONSTRAINTS.monthlyDay.min ||
			settingsObj.monthlyDay > SCHEDULE_SETTINGS_CONSTRAINTS.monthlyDay.max
		) {
			return {
				isValid: false,
				error: "monthlyDay は 1 から 31 の間である必要があります",
			};
		}

		// skipIfRunning チェック
		if (typeof settingsObj.skipIfRunning !== "boolean") {
			return {
				isValid: false,
				error: "skipIfRunning は boolean 型である必要があります",
			};
		}

		// maxExecutionTimeMinutes チェック
		if (
			typeof settingsObj.maxExecutionTimeMinutes !== "number" ||
			settingsObj.maxExecutionTimeMinutes <
				SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.min ||
			settingsObj.maxExecutionTimeMinutes >
				SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.max
		) {
			return {
				isValid: false,
				error: `maxExecutionTimeMinutes は ${SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.min} から ${SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.max} の間である必要があります`,
			};
		}

		// onlyWhenIdle チェック
		if (typeof settingsObj.onlyWhenIdle !== "boolean") {
			return {
				isValid: false,
				error: "onlyWhenIdle は boolean 型である必要があります",
			};
		}

		return { isValid: true };
	}
}