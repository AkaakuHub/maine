/**
 * スキャンスケジュール設定の永続化サービス
 * DB操作とTypeScript型の相互変換を管理
 */
import { PrismaClient as SettingsPrismaClient } from "../../prisma/generated/settings";
import {
	type ScanScheduleSettings,
	DEFAULT_SCHEDULE_SETTINGS,
} from "@/types/scanScheduleSettings";

export class ScanSchedulePersistenceService {
	private settingsDb: SettingsPrismaClient;

	constructor() {
		this.settingsDb = new SettingsPrismaClient();
	}

	/**
	 * スケジュール設定をDBから読み込み
	 */
	async loadSettings(): Promise<ScanScheduleSettings> {
		try {
			const record = await this.settingsDb.scanScheduleSettings.findUnique({
				where: { id: "scan_schedule_settings" },
			});

			if (!record) {
				// レコードが存在しない場合はデフォルト設定を使用
				console.log(
					"スケジュール設定が存在しません。デフォルト設定を使用します",
				);
				return DEFAULT_SCHEDULE_SETTINGS;
			}

			// DB形式からTypeScript型へ変換
			return this.dbToTypeScript(record);
		} catch (error) {
			console.error("スケジュール設定の読み込みでエラー:", error);
			return DEFAULT_SCHEDULE_SETTINGS;
		}
	}

	/**
	 * スケジュール設定をDBに保存
	 */
	async saveSettings(settings: ScanScheduleSettings): Promise<void> {
		try {
			const dbData = this.typeScriptToDb(settings);

			await this.settingsDb.scanScheduleSettings.upsert({
				where: { id: "scan_schedule_settings" },
				update: dbData,
				create: {
					id: "scan_schedule_settings",
					...dbData,
				},
			});

			console.log("スケジュール設定をDBに保存しました");
		} catch (error) {
			console.error("スケジュール設定の保存でエラー:", error);
			throw new Error("スケジュール設定の保存に失敗しました");
		}
	}

	/**
	 * デフォルト設定でレコードを初期化
	 */
	async initializeDefaultSettings(): Promise<void> {
		try {
			const existingRecord =
				await this.settingsDb.scanScheduleSettings.findUnique({
					where: { id: "scan_schedule_settings" },
				});

			if (!existingRecord) {
				await this.saveSettings(DEFAULT_SCHEDULE_SETTINGS);
				console.log("デフォルトスケジュール設定を初期化しました");
			}
		} catch (error) {
			console.error("スケジュール設定の初期化でエラー:", error);
			throw new Error("スケジュール設定の初期化に失敗しました");
		}
	}

	/**
	 * DB形式をTypeScript型に変換
	 */
	private dbToTypeScript(record: {
		enabled: boolean;
		cronPattern: string | null;
		interval: string;
		intervalHours: number;
		executionTimeHour: number;
		executionTimeMinute: number;
		weeklyDays: string;
		monthlyDay: number;
		skipIfRunning: boolean;
		maxExecutionTimeMinutes: number;
		onlyWhenIdle: boolean;
	}): ScanScheduleSettings {
		return {
			enabled: record.enabled,
			cronPattern: record.cronPattern || undefined,
			interval: record.interval as "daily" | "weekly" | "monthly" | "custom",
			intervalHours: record.intervalHours,
			executionTime: {
				hour: record.executionTimeHour,
				minute: record.executionTimeMinute,
			},
			weeklyDays: JSON.parse(record.weeklyDays),
			monthlyDay: record.monthlyDay,
			skipIfRunning: record.skipIfRunning,
			maxExecutionTimeMinutes: record.maxExecutionTimeMinutes,
			onlyWhenIdle: record.onlyWhenIdle,
		};
	}

	/**
	 * TypeScript型をDB形式に変換
	 */
	private typeScriptToDb(settings: ScanScheduleSettings) {
		return {
			enabled: settings.enabled,
			cronPattern: settings.cronPattern || null,
			interval: settings.interval,
			intervalHours: settings.intervalHours,
			executionTimeHour: settings.executionTime.hour,
			executionTimeMinute: settings.executionTime.minute,
			weeklyDays: JSON.stringify(settings.weeklyDays),
			monthlyDay: settings.monthlyDay,
			skipIfRunning: settings.skipIfRunning,
			maxExecutionTimeMinutes: settings.maxExecutionTimeMinutes,
			onlyWhenIdle: settings.onlyWhenIdle,
		};
	}

	/**
	 * データベース接続をクローズ
	 */
	async close(): Promise<void> {
		await this.settingsDb.$disconnect();
	}
}
