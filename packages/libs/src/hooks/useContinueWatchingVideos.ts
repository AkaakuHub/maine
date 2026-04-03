"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoFileData } from "../type";
import { PAGINATION } from "../utils/constants";
import { fetchContinueWatchingVideos } from "../application/services/video-service";
import {
	getFallbackPagination,
	mergeUniqueItems,
	normalizePagination,
	type ApiPaginationInfo,
	type PaginationInfo,
} from "../application/support/pagination";

interface UseContinueWatchingOptions {
	page?: number;
	limit?: number;
	enabled?: boolean;
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
			return fetchContinueWatchingVideos(params);
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
			setVideos((prev) => mergeUniqueItems(prev, nextVideos));
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
