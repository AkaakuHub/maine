"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthAPI } from "../api/auth";
import type { VideoFileData } from "../type";
import { createApiUrl } from "../utils/api";

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

interface UseContinueWatchingReturn {
	videos: VideoFileData[];
	loading: boolean;
	error: string | null;
	pagination: PaginationInfo;
	refetch: () => Promise<void>;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export function useContinueWatchingVideos(
	options: UseContinueWatchingOptions = {},
): UseContinueWatchingReturn {
	const { page = 1, limit = 20, enabled = true } = options;
	const [videos, setVideos] = useState<VideoFileData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pagination, setPagination] = useState<PaginationInfo>({
		page,
		limit,
		total: 0,
		totalPages: 0,
	});

	const query = useMemo(() => {
		const params = new URLSearchParams();
		params.set("page", page.toString());
		params.set("limit", limit.toString());
		return params.toString();
	}, [page, limit]);

	const fetchVideos = useCallback(async () => {
		if (!enabled) {
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await fetch(createApiUrl(`/videos/continue?${query}`), {
				headers: AuthAPI.getAuthHeaders(),
				signal: AbortSignal.timeout(30000),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			setVideos(data.videos || []);
			if (data.pagination) {
				setPagination(data.pagination);
			} else {
				setPagination({
					page,
					limit,
					total: data.videos?.length ?? 0,
					totalPages: data.videos?.length ? 1 : 0,
				});
			}
		} catch (err) {
			console.error("Failed to fetch continue watching videos:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setVideos([]);
			setPagination({ page: 1, limit, total: 0, totalPages: 0 });
		} finally {
			setLoading(false);
		}
	}, [enabled, query, limit, page]);

	useEffect(() => {
		if (enabled) {
			void fetchVideos();
		}
	}, [enabled, fetchVideos]);

	const refetch = useCallback(async () => {
		await fetchVideos();
	}, [fetchVideos]);

	const hasNextPage = pagination.page < pagination.totalPages;
	const hasPrevPage = pagination.page > 1;

	return {
		videos,
		loading,
		error,
		pagination,
		refetch,
		hasNextPage,
		hasPrevPage,
	};
}
