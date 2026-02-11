"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthAPI } from "../api/auth";
import type { VideoFileData } from "../type";
import { createApiUrl } from "../utils/api";
import { PAGINATION } from "../utils/constants";

interface UseContinueWatchingOptions {
	page?: number;
	limit?: number;
	enabled?: boolean;
}

interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

interface ApiPaginationInfo {
	page?: unknown;
	limit?: unknown;
	total?: unknown;
	totalPages?: unknown;
}

interface UseContinueWatchingApiResponse {
	videos: VideoFileData[];
	pagination?: ApiPaginationInfo;
}

interface UseContinueWatchingReturn {
	videos: VideoFileData[];
	loading: boolean;
	error: string | null;
	pagination: PaginationInfo;
	refetch: () => Promise<void>;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	loadNextPage: () => Promise<void>;
	isFetchingNextPage: boolean;
}

const getFallbackPagination = (
	page: number,
	limit: number,
	videosLength: number,
): PaginationInfo => ({
	page,
	limit,
	total: videosLength,
	totalPages: videosLength > 0 ? 1 : 0,
});

const normalizeNumber = (value: unknown, fallback: number): number => {
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
};

const normalizePagination = (
	pagination: ApiPaginationInfo | undefined,
	fallback: PaginationInfo,
): PaginationInfo => {
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
};

const mergeUniqueVideos = (
	prevVideos: VideoFileData[],
	nextVideos: VideoFileData[],
): VideoFileData[] => {
	const existingIds = new Set(prevVideos.map((video) => video.id));
	const merged = [...prevVideos];

	for (const video of nextVideos) {
		if (!existingIds.has(video.id)) {
			merged.push(video);
			existingIds.add(video.id);
		}
	}

	return merged;
};

export function useContinueWatchingVideos(
	options: UseContinueWatchingOptions = {},
): UseContinueWatchingReturn {
	const {
		page = PAGINATION.DEFAULT_PAGE,
		limit = PAGINATION.DEFAULT_LIMIT,
		enabled = true,
	} = options;

	const [videos, setVideos] = useState<VideoFileData[]>([]);
	const [loading, setLoading] = useState(false);
	const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pagination, setPagination] = useState<PaginationInfo>({
		page,
		limit,
		total: 0,
		totalPages: 0,
	});
	const requestVersionRef = useRef(0);

	const baseQuery = useMemo(() => {
		const params = new URLSearchParams();
		params.set("limit", limit.toString());
		return params.toString();
	}, [limit]);

	const fetchPage = useCallback(
		async (targetPage: number): Promise<UseContinueWatchingApiResponse> => {
			const params = new URLSearchParams(baseQuery);
			params.set("page", targetPage.toString());

			const response = await fetch(
				createApiUrl(`/videos/continue?${params.toString()}`),
				{
					headers: AuthAPI.getAuthHeaders(),
					signal: AbortSignal.timeout(30000),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return (await response.json()) as UseContinueWatchingApiResponse;
		},
		[baseQuery],
	);

	const fetchFirstPage = useCallback(async () => {
		if (!enabled) {
			return;
		}

		const requestVersion = ++requestVersionRef.current;

		try {
			setLoading(true);
			setError(null);

			const data = await fetchPage(PAGINATION.DEFAULT_PAGE);
			if (requestVersion !== requestVersionRef.current) {
				return;
			}

			const fetchedVideos = data.videos || [];
			const fallbackPagination = getFallbackPagination(
				PAGINATION.DEFAULT_PAGE,
				limit,
				fetchedVideos.length,
			);
			setVideos(fetchedVideos);
			setPagination(normalizePagination(data.pagination, fallbackPagination));
		} catch (err) {
			if (requestVersion !== requestVersionRef.current) {
				return;
			}
			console.error("Failed to fetch continue watching videos:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setVideos([]);
			setPagination(getFallbackPagination(PAGINATION.DEFAULT_PAGE, limit, 0));
		} finally {
			if (requestVersion === requestVersionRef.current) {
				setLoading(false);
				setIsFetchingNextPage(false);
			}
		}
	}, [enabled, fetchPage, limit]);

	useEffect(() => {
		if (enabled) {
			void fetchFirstPage();
		}
	}, [enabled, fetchFirstPage]);

	const hasNextPage = pagination.page < pagination.totalPages;
	const hasPrevPage = pagination.page > PAGINATION.DEFAULT_PAGE;

	const loadNextPage = useCallback(async () => {
		if (!enabled || loading || isFetchingNextPage || !hasNextPage) {
			return;
		}

		const requestVersion = requestVersionRef.current;
		const nextPage = pagination.page + 1;

		try {
			setIsFetchingNextPage(true);
			setError(null);

			const data = await fetchPage(nextPage);
			if (requestVersion !== requestVersionRef.current) {
				return;
			}

			const nextVideos = data.videos || [];
			setVideos((prev) => mergeUniqueVideos(prev, nextVideos));
			setPagination((prev) => {
				const fallback = getFallbackPagination(
					nextPage,
					prev.limit,
					nextVideos.length,
				);
				const responsePagination = normalizePagination(
					data.pagination,
					fallback,
				);

				return {
					page: Math.max(prev.page, responsePagination.page),
					limit: responsePagination.limit,
					total: responsePagination.total,
					totalPages: responsePagination.totalPages,
				};
			});
		} catch (err) {
			if (requestVersion !== requestVersionRef.current) {
				return;
			}
			console.error("Failed to fetch next continue videos page:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			if (requestVersion === requestVersionRef.current) {
				setIsFetchingNextPage(false);
			}
		}
	}, [
		enabled,
		loading,
		isFetchingNextPage,
		hasNextPage,
		pagination.page,
		fetchPage,
	]);

	const refetch = useCallback(async () => {
		await fetchFirstPage();
	}, [fetchFirstPage]);

	return {
		videos,
		loading,
		error,
		pagination,
		refetch,
		hasNextPage,
		hasPrevPage,
		loadNextPage,
		isFetchingNextPage,
	};
}
