"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthAPI } from "../api/auth";
import type { VideoFileData } from "../type";
import { createApiUrl } from "../utils/api";

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

interface UseVideosReturn {
	videos: VideoFileData[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	refetch: () => Promise<void>;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export function useVideos(options: UseVideosOptions = {}): UseVideosReturn {
	const {
		filters = {},
		sorting = { sortBy: "title", sortOrder: "asc" },
		pagination = { page: 1, limit: 20 },
		enabled = true,
	} = options;
	const [videos, setVideos] = useState<VideoFileData[]>([]);
	const [loading, setLoading] = useState(false); // 初期状態はfalseに変更
	const [error, setError] = useState<string | null>(null);
	const [paginationInfo, setPaginationInfo] = useState({
		page: pagination.page,
		limit: pagination.limit,
		total: 0,
		totalPages: 0,
	});

	// URLパラメータを構築
	const searchParams = useMemo(() => {
		const params = new URLSearchParams();

		// 検索クエリを常に設定（undefinedの場合は空文字）
		params.set("search", (filters.search || "").trim());

		params.set("sortBy", sorting.sortBy);
		params.set("sortOrder", sorting.sortOrder);
		params.set("page", pagination.page.toString());
		params.set("limit", pagination.limit.toString());
		return params.toString();
	}, [
		filters.search,
		sorting.sortBy,
		sorting.sortOrder,
		pagination.page,
		pagination.limit,
	]);
	// データを取得する関数
	const fetchVideos = useCallback(async () => {
		if (!enabled) {
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const url = createApiUrl(`/videos?${searchParams}`);

			const response = await fetch(url, {
				headers: AuthAPI.getAuthHeaders(),
				signal: AbortSignal.timeout(30000),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const responseText = await response.text();
			if (!responseText) {
				throw new Error("Empty response from server");
			}

			interface ApiResponse {
				videos: VideoFileData[];
				pagination?: {
					page: number;
					limit: number;
					total: number;
					totalPages: number;
				};
			}

			let data: ApiResponse;
			try {
				data = JSON.parse(responseText);
			} catch (parseError) {
				console.error(
					"JSON parse error:",
					parseError,
					"Response:",
					responseText,
				);
				throw new Error("Invalid JSON response from server");
			}

			setVideos(data.videos || []);
			setPaginationInfo(
				data.pagination || {
					page: pagination.page,
					limit: pagination.limit,
					total: 0,
					totalPages: 0,
				},
			);
		} catch (err) {
			console.error("Failed to fetch videos:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setVideos([]);
			setPaginationInfo({
				page: 1,
				limit: pagination.limit,
				total: 0,
				totalPages: 0,
			});
		} finally {
			setLoading(false);
		}
	}, [enabled, searchParams, pagination.limit, pagination.page]);

	// 初期化とパラメータ変更時にデータを取得
	useEffect(() => {
		fetchVideos();
	}, [fetchVideos]); // fetchVideosを依存配列に追加

	// 再フェッチ用の安定した関数
	const refetch = useCallback(async () => {
		await fetchVideos();
	}, [fetchVideos]);

	// ページネーション情報を計算
	const hasNextPage = paginationInfo.page < paginationInfo.totalPages;
	const hasPrevPage = paginationInfo.page > 1;

	return {
		videos,
		loading,
		error,
		pagination: paginationInfo,
		refetch,
		hasNextPage,
		hasPrevPage,
	};
}
