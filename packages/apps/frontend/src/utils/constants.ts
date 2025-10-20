/**
 * アプリケーション定数
 */

// ページネーション関連
export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 20, // パフォーマンス向上のため20に削減
	MAX_LIMIT: 100,
	MIN_LIMIT: 1,
} as const;

// スキャン関連
export const SCAN = {
	// デフォルト設定値
	DEFAULT_BATCH_SIZE: 50,
	DEFAULT_PROGRESS_UPDATE_INTERVAL: 100,
	DEFAULT_SLEEP_INTERVAL: 1,
	DEFAULT_MEMORY_THRESHOLD_MB: 1024,
	DEFAULT_AUTO_PAUSE_THRESHOLD: 80,
	DEFAULT_AUTO_PAUSE_START_HOUR: 9,
	DEFAULT_AUTO_PAUSE_END_HOUR: 18,

	// 制約値
	MIN_BATCH_SIZE: 1,
	MAX_BATCH_SIZE: 200,
	MIN_PROGRESS_UPDATE_INTERVAL: 10,
	MAX_PROGRESS_UPDATE_INTERVAL: 1000,
	MIN_SLEEP_INTERVAL: 0,
	MAX_SLEEP_INTERVAL: 100,
	MIN_CONCURRENT_OPERATIONS: 1,
	MAX_CONCURRENT_OPERATIONS: 8,
	MIN_MEMORY_THRESHOLD_MB: 256,
	MAX_MEMORY_THRESHOLD_MB: 2048,
	MIN_AUTO_PAUSE_THRESHOLD: 50,
	MAX_AUTO_PAUSE_THRESHOLD: 95,

	// パフォーマンス監視設定
	MEMORY_USAGE_HISTORY_SIZE: 10,
	CPU_CHECK_INTERVAL_MS: 5000,
	CPU_AUTO_RESUME_THRESHOLD_RATIO: 0.8,
	PROGRESS_WINDOW_DURATION_SEC: 30,

	// バッチサイズ調整倍率
	BATCH_SIZE_REDUCTION_RATIO: 0.5,
	BATCH_SIZE_INCREASE_RATIO: 1.5,
	LOW_PRIORITY_RATIO: 0.7,
	HIGH_PRIORITY_RATIO: 1.3,
	MEMORY_HIGH_THRESHOLD: 80,
	MEMORY_LOW_THRESHOLD: 40,
	MIN_BATCH_SIZE_AFTER_REDUCTION: 5,

	// チェックポイント設定
	CHECKPOINT_VALIDITY_HOURS: 24,
	TRANSACTION_TIMEOUT_MS: 600000, // 10分

	// ストリーム処理
	STREAM_PROCESSING_THRESHOLD: 1000, // この数以上のファイルでストリーム処理を使用

	// スキャンID生成
	SCAN_ID_PREFIX: "scan_",

	// スケジューラー設定
	SCHEDULE_CHECK_INTERVAL_MS: 60000, // 1分間隔でスケジュールチェック
	DEFAULT_SCHEDULE_HOUR: 3, // デフォルト実行時刻（3時）
	DEFAULT_SCHEDULE_MINUTE: 0, // デフォルト実行分（0分）
	DEFAULT_MAX_EXECUTION_TIME_MINUTES: 180, // デフォルト最大実行時間（3時間）
	MIN_EXECUTION_TIME_MINUTES: 30, // 最小実行時間
	MAX_EXECUTION_TIME_MINUTES: 720, // 最大実行時間（12時間）
	DEFAULT_MONTHLY_DAY: 1, // デフォルト月次実行日（1日）
} as const;
// テーマ関連
export const THEME = {
	STORAGE_KEY: "theme",
	MODES: {
		LIGHT: "light",
		DARK: "dark",
		SYSTEM: "system",
	},
	DEFAULT_MODE: "dark",
} as const;

// 動画時間フォーマット関数
export const formatDuration = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
};
