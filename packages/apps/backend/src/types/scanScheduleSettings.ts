/**
 * スキャンスケジュール設定の型定義
 */
import { SCAN } from "../utils/constants";

/**
 * スキャンスケジュール設定（Cronライブラリ対応版）
 */
export interface ScanScheduleSettings {
	// 基本スケジュール設定
	enabled: boolean; // スケジュール機能の有効/無効
	cronPattern?: string; // 内部用cron式（自動生成）

	// UIサポート用設定（cronパターン生成に使用）
	interval: "daily" | "weekly" | "monthly" | "custom"; // 実行間隔
	intervalHours: number; // カスタム間隔（時間）

	// 実行タイミング
	executionTime: {
		hour: number; // 実行時刻（0-23）
		minute: number; // 実行分（0-59）
	};

	// 曜日指定（週次実行時）
	weeklyDays: number[]; // [0-6] 日曜=0, 月曜=1...

	// 月次指定
	monthlyDay: number; // 実行日（1-31）

	// 制御設定
	skipIfRunning: boolean; // 手動実行中はスキップ
	maxExecutionTimeMinutes: number; // 最大実行時間（タイムアウト）
	onlyWhenIdle: boolean; // システムアイドル時のみ実行（将来拡張用）
}

/**
 * デフォルトスケジュール設定
 */
export const DEFAULT_SCHEDULE_SETTINGS: ScanScheduleSettings = {
	// 基本設定（週次、日曜3時実行）
	enabled: false,
	interval: "weekly",
	intervalHours: 168, // 週1回

	// 実行タイミング（日曜3:00）
	executionTime: {
		hour: SCAN.DEFAULT_SCHEDULE_HOUR,
		minute: SCAN.DEFAULT_SCHEDULE_MINUTE,
	},

	// 週次設定（日曜日）
	weeklyDays: [0], // 日曜日

	// 月次設定（毎月1日）
	monthlyDay: SCAN.DEFAULT_MONTHLY_DAY,

	// 制御設定
	skipIfRunning: true, // 安全のため有効
	maxExecutionTimeMinutes: SCAN.DEFAULT_MAX_EXECUTION_TIME_MINUTES,
	onlyWhenIdle: false, // 将来実装予定
};

/**
 * スケジューラーの状態
 */
export interface SchedulerStatus {
	isEnabled: boolean; // スケジュール機能有効/無効
	isRunning: boolean; // 現在実行中かどうか
	nextExecution: Date | null; // 次回実行予定時刻
	lastExecution: Date | null; // 最後に実行した時刻
	lastExecutionStatus: "completed" | "failed" | "cancelled" | "timeout" | null;
	currentExecutionStartTime: Date | null; // 現在実行中の場合の開始時刻
}
