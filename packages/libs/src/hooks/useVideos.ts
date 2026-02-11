"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthAPI } from "../api/auth";
import type { VideoFileData } from "../type";
import { createApiUrl } from "../utils/api";
import { PAGINATION } from "../utils/constants";

interface UseVideosFilters {
	search?: string;
}

interface UseVideosSorting {
	sortBy: "title" | "year" | "episode" | "createdAt" | "lastWatched";
	sortOrder: "asc" | "desc";
}

interface UseVideosPagination {
	page: number;
	limit: number;
}

interface UseVideosOptions {
	filters?: UseVideosFilters;
	sorting?: UseVideosSorting;
	pagination?: UseVideosPagination;
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

interface UseVideosApiResponse {
	videos: VideoFileData[];
	pagination?: ApiPaginationInfo;
}

interface UseVideosReturn {
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

export function useVideos(options: UseVideosOptions = {}): UseVideosReturn {
	const {
		filters = {},
		sorting = { sortBy: "title", sortOrder: "asc" },
		pagination = {
			page: PAGINATION.DEFAULT_PAGE,
			limit: PAGINATION.DEFAULT_LIMIT,
		},
		enabled = true,
	} = options;

	const [videos, setVideos] = useState<VideoFileData[]>([]);
	const [loading, setLoading] = useState(false);
	const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
		page: pagination.page,
		limit: pagination.limit,
		total: 0,
		totalPages: 0,
	});
	const requestVersionRef = useRef(0);

	const baseParams = useMemo(() => {
		const params = new URLSearchParams();
		params.set("search", (filters.search || "").trim());
		params.set("sortBy", sorting.sortBy);
		params.set("sortOrder", sorting.sortOrder);
		params.set("limit", pagination.limit.toString());
		return params.toString();
	}, [filters.search, sorting.sortBy, sorting.sortOrder, pagination.limit]);

	const fetchPage = useCallback(
		async (page: number): Promise<UseVideosApiResponse> => {
			const params = new URLSearchParams(baseParams);
			params.set("page", page.toString());

			const response = await fetch(
				createApiUrl(`/videos?${params.toString()}`),
				{
					headers: AuthAPI.getAuthHeaders(),
					signal: AbortSignal.timeout(30000),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const responseText = await response.text();
			if (!responseText) {
				throw new Error("Empty response from server");
			}

			try {
				return JSON.parse(responseText) as UseVideosApiResponse;
			} catch (parseError) {
				console.error(
					"JSON parse error:",
					parseError,
					"Response:",
					responseText,
				);
				throw new Error("Invalid JSON response from server");
			}
		},
		[baseParams],
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
				pagination.limit,
				fetchedVideos.length,
			);
			setVideos(fetchedVideos);
			setPaginationInfo(
				normalizePagination(data.pagination, fallbackPagination),
			);
		} catch (err) {
			if (requestVersion !== requestVersionRef.current) {
				return;
			}
			console.error("Failed to fetch videos:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setVideos([]);
			setPaginationInfo(
				getFallbackPagination(PAGINATION.DEFAULT_PAGE, pagination.limit, 0),
			);
		} finally {
			if (requestVersion === requestVersionRef.current) {
				setLoading(false);
				setIsFetchingNextPage(false);
			}
		}
	}, [enabled, fetchPage, pagination.limit]);

	useEffect(() => {
		void fetchFirstPage();
	}, [fetchFirstPage]);

	const hasNextPage = paginationInfo.page < paginationInfo.totalPages;
	const hasPrevPage = paginationInfo.page > PAGINATION.DEFAULT_PAGE;

	const loadNextPage = useCallback(async () => {
		if (!enabled || loading || isFetchingNextPage || !hasNextPage) {
			return;
		}

		const requestVersion = requestVersionRef.current;
		const nextPage = paginationInfo.page + 1;

		try {
			setIsFetchingNextPage(true);
			setError(null);

			const data = await fetchPage(nextPage);
			if (requestVersion !== requestVersionRef.current) {
				return;
			}

			const nextVideos = data.videos || [];
			setVideos((prev) => mergeUniqueVideos(prev, nextVideos));
			setPaginationInfo((prev) => {
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
			console.error("Failed to fetch next videos page:", err);
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
		paginationInfo.page,
		fetchPage,
	]);

	const refetch = useCallback(async () => {
		await fetchFirstPage();
	}, [fetchFirstPage]);

	return {
		videos,
		loading,
		error,
		pagination: paginationInfo,
		refetch,
		hasNextPage,
		hasPrevPage,
		loadNextPage,
		isFetchingNextPage,
	};
}
