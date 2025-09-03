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

// 検索関連
export const SEARCH = {
	MAX_QUERY_LENGTH: 100,
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
} as const;

// FFprobe/FFmpeg関連
export const FFPROBE = {
	// デフォルトサムネイル設定
	DEFAULT_SEEK_TIME: 20, // 秒
	DEFAULT_THUMBNAIL_QUALITY: 70, // WebP品質
	DEFAULT_THUMBNAIL_WIDTH: 300, // ピクセル
	MAX_THUMBNAIL_FILE_SIZE_KB: 100, // KB

	// 並列処理設定
	DEFAULT_METADATA_CONCURRENCY: 4,
	DEFAULT_THUMBNAIL_CONCURRENCY: 2, // サムネイル生成は重い処理

	// タイムアウト設定
	FFPROBE_TIMEOUT_MS: 30000, // 30秒
	FFMPEG_TIMEOUT_MS: 60000, // 60秒
} as const;

// API関連
export const API = {
	ENDPOINTS: {
		VIDEOS: "/api/videos",
		GET_VIDEO: "/api/getVideo",
		VIDEO_STREAM: "/api/video",
		PROGRESS: "/api/progress",
		PROGRAM_INFO: "/api/programInfo",
		THUMBNAILS: "/api/thumbnails",
	},
	TIMEOUT: 30000,
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
