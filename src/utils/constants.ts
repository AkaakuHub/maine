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
	MIN_QUERY_LENGTH: 2, // 最小検索文字数を2に設定
} as const;
// UI関連

// API関連
export const API = {
	ENDPOINTS: {
		VIDEOS: "/api/videos",
		GET_VIDEO: "/api/getVideo",
		VIDEO_STREAM: "/api/video",
		PROGRESS: "/api/progress",
	},
	TIMEOUT: 30000,
} as const;
