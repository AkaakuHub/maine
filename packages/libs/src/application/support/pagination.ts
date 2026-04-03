import { PAGINATION } from "../../utils/constants";

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ApiPaginationInfo {
	page?: unknown;
	limit?: unknown;
	total?: unknown;
	totalPages?: unknown;
}

export function getFallbackPagination(
	page: number,
	limit: number,
	videosLength: number,
): PaginationInfo {
	return {
		page,
		limit,
		total: videosLength,
		totalPages: videosLength > 0 ? 1 : 0,
	};
}

function normalizeNumber(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return fallback;
}

export function normalizePagination(
	pagination: ApiPaginationInfo | undefined,
	fallback: PaginationInfo,
): PaginationInfo {
	if (!pagination) {
		return fallback;
	}

	const page = Math.max(
		PAGINATION.DEFAULT_PAGE,
		normalizeNumber(pagination.page, fallback.page),
	);
	const limit = Math.max(
		PAGINATION.MIN_LIMIT,
		normalizeNumber(pagination.limit, fallback.limit),
	);
	const total = Math.max(0, normalizeNumber(pagination.total, fallback.total));
	const totalPages = Math.max(
		0,
		normalizeNumber(pagination.totalPages, fallback.totalPages),
	);

	return {
		page,
		limit,
		total,
		totalPages,
	};
}

export function mergeUniqueItems<T extends { id: string }>(
	currentItems: T[],
	nextItems: T[],
): T[] {
	const existingIds = new Set(currentItems.map((item) => item.id));
	const merged = [...currentItems];

	for (const item of nextItems) {
		if (!existingIds.has(item.id)) {
			merged.push(item);
			existingIds.add(item.id);
		}
	}

	return merged;
}
