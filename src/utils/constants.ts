/**
 * アプリケーション定数
 */

// 動画ファイル関連
export const VIDEO_EXTENSIONS = [
	".mp4",
	".mkv",
	".avi",
	".mov",
	".wmv",
	".flv",
	".webm",
	".m4v",
	".ts",
	".m2ts",
] as const;

export const SUPPORTED_VIDEO_TYPES = {
	MP4: "video/mp4",
	WEBM: "video/webm",
	AVI: "video/x-msvideo",
	MOV: "video/quicktime",
	MKV: "video/x-matroska",
} as const;

// ページネーション関連
export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 20, // パフォーマンス向上のため20に削減
	MAX_LIMIT: 100,
	MIN_LIMIT: 1,
} as const;

// ソート関連
export const SORT_FIELDS = {
	TITLE: "title",
	YEAR: "year",
	EPISODE: "episode",
	CREATED_AT: "createdAt",
	LAST_WATCHED: "lastWatched",
} as const;

export const SORT_ORDERS = {
	ASC: "asc",
	DESC: "desc",
} as const;

// 検索関連
export const SEARCH = {
	MAX_QUERY_LENGTH: 100,
	MIN_QUERY_LENGTH: 2, // 最小検索文字数を2に設定
} as const;

// ファイルサイズ関連
export const FILE_SIZE = {
	UNITS: ["B", "KB", "MB", "GB", "TB"] as const,
	THRESHOLD: 1024,
} as const;

// 評価関連
export const RATING = {
	MIN: 0,
	MAX: 10,
	DEFAULT: 0,
} as const;

// 年の範囲
export const YEAR_RANGE = {
	MIN: 1900,
	MAX: new Date().getFullYear() + 10,
} as const;

// UI関連
export const UI = {
	ANIMATION_DURATION: 300,
	DEBOUNCE_DELAY: 500,
	TOAST_DURATION: 3000,
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
	GENERIC: "エラーが発生しました",
	NETWORK: "ネットワークエラーが発生しました",
	NOT_FOUND: "データが見つかりません",
	INVALID_REQUEST: "無効なリクエストです",
	SERVER_ERROR: "サーバーエラーが発生しました",
	FILE_NOT_FOUND: "ファイルが見つかりません",
	INVALID_FILE_PATH: "無効なファイルパスです",
	DATABASE_ERROR: "データベースエラーが発生しました",
} as const;

// 成功メッセージ
export const SUCCESS_MESSAGES = {
	DATABASE_UPDATED: "データベースが正常に更新されました",
	WATCH_TIME_UPDATED: "視聴時間が更新されました",
	RATING_UPDATED: "評価が更新されました",
} as const;

// API関連
export const API = {
	ENDPOINTS: {
		ANIMES: "/api/animes",
		UPDATE_DATABASE: "/api/updateDatabase",
		GET_VIDEO: "/api/getVideo",
		VIDEO_STREAM: "/api/video",
		PROGRESS: "/api/progress",
	},
	TIMEOUT: 30000,
} as const;
