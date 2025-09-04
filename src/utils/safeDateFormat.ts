/**
 * SSR安全な日時フォーマットユーティリティ
 * hydrationエラーを防ぐための正しいアプローチ：
 * - サーバー/クライアント条件分岐は使用しない
 * - useEffect + useState パターンでクライアント側で値を設定
 * - 純粋な日付フォーマット関数のみ提供
 */

/**
 * 純粋な日付フォーマット関数（hydration安全）
 */
export function formatDate(
	date: Date | string | null,
	fallback = "---",
): string {
	if (!date) return fallback;
	try {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		if (Number.isNaN(dateObj.getTime())) return fallback;
		return dateObj.toLocaleDateString("ja-JP");
	} catch {
		return fallback;
	}
}

export function formatTime(
	date: Date | string | null,
	fallback = "---",
): string {
	if (!date) return fallback;
	try {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		if (Number.isNaN(dateObj.getTime())) return fallback;
		return dateObj.toLocaleTimeString("ja-JP");
	} catch {
		return fallback;
	}
}

export function formatDateTime(
	date: Date | string | null,
	fallback = "---",
): string {
	if (!date) return fallback;
	try {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		if (Number.isNaN(dateObj.getTime())) return fallback;
		return dateObj.toLocaleString("ja-JP");
	} catch {
		return fallback;
	}
}

/**
 * 現在時刻フォーマット（hydration安全のため、useEffectで使用すること）
 */
export function formatCurrentTime(): string {
	return new Date().toLocaleTimeString("ja-JP");
}

export function formatCurrentDateTime(): string {
	return new Date().toLocaleString("ja-JP");
}

// 後方互換性のためのエイリアス
export const formatSafeDate = formatDate;
export const formatSafeTime = formatTime;
export const formatSafeDateTime = formatDateTime;
