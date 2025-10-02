/**
 * スキャンスケジュール設定の型定義
 */

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
 * スケジュール実行ログエントリ
 */
export interface ScheduleExecutionLog {
	id: number;
	executionType: "manual" | "scheduled";
	scheduledAt: Date | null; // スケジュール実行の場合の予定時刻
	startedAt: Date;
	completedAt: Date | null;
	status: "running" | "completed" | "failed" | "cancelled" | "timeout";
	filesProcessed: number;
	totalFiles: number;
	errorMessage?: string;
}

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