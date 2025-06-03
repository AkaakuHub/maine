/**
 * URLパラメータのバリデーション関数群
 */

export interface PaginationParams {
	page: number;
	limit: number;
}

export interface SortParams {
	sortBy: string;
	sortOrder: "asc" | "desc";
}

/**
 * ページネーションパラメータをバリデーションして返す
 */
export function validatePaginationParams(
	page?: string | null,
	limit?: string | null,
): PaginationParams {
	const validatedPage = Math.max(1, Number.parseInt(page || "1", 10) || 1);
	const validatedLimit = Math.max(
		1,
		Math.min(100, Number.parseInt(limit || "50", 10) || 50),
	);

	return {
		page: validatedPage,
		limit: validatedLimit,
	};
}

/**
 * ソートパラメータをバリデーションして返す
 */
export function validateSortParams(
	sortBy?: string | null,
	sortOrder?: string | null,
	allowedSortFields: string[] = [
		"title",
		"year",
		"episode",
		"createdAt",
		"lastWatched",
	],
): SortParams {
	const validSortBy = allowedSortFields.includes(sortBy || "")
		? sortBy || "title"
		: "title";
	const validSortOrder = sortOrder === "desc" ? "desc" : "asc";

	return {
		sortBy: validSortBy,
		sortOrder: validSortOrder,
	};
}

/**
 * 検索クエリをサニタイズ
 */
export function sanitizeSearchQuery(query?: string | null): string | undefined {
	if (!query || typeof query !== "string") return undefined;

	// HTMLタグを除去し、長さを制限
	return (
		query
			.replace(/<[^>]*>/g, "")
			.trim()
			.substring(0, 100) || undefined
	);
}

/**
 * 年パラメータをバリデーション
 */
export function validateYearParam(year?: string | null): number | undefined {
	if (!year) return undefined;

	const yearNum = Number.parseInt(year, 10);
	const currentYear = new Date().getFullYear();

	if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 10) {
		return undefined;
	}

	return yearNum;
}

/**
 * 動画IDの形式をバリデーション（UUIDなど）
 */
export function validateVideoId(id?: string | null): string | null {
	if (!id || typeof id !== "string") return null;

	// UUIDの簡単なバリデーション
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	return uuidRegex.test(id) ? id : null;
}

/**
 * ファイルパスの安全性をチェック
 */
export function isSecureFilePath(filePath: string): boolean {
	// 危険なパターンをチェック
	const dangerousPatterns = [
		/\.\./, // ディレクトリトラバーサル
		/^\/$/, // ルートディレクトリ
		/^[a-zA-Z]:\\/, // Windows絶対パス
		/[<>:"|?*]/, // 無効な文字
	];

	return !dangerousPatterns.some((pattern) => pattern.test(filePath));
}
