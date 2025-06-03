import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AnimeData } from "@/type";
import { API } from "@/utils/constants";

export interface UseAnimesFilters {
	search?: string;
	genre?: string;
	year?: string;
}

export interface UseAnimesSorting {
	sortBy: "title" | "year" | "episode" | "createdAt" | "lastWatched";
	sortOrder: "asc" | "desc";
}

export interface UseAnimesPagination {
	page: number;
	limit: number;
}

export interface UseAnimesOptions {
	filters?: UseAnimesFilters;
	sorting?: UseAnimesSorting;
	pagination?: UseAnimesPagination;
	enabled?: boolean;
	loadAll?: boolean; // 明示的な一覧読み込みフラグ
}

export interface UseAnimesReturn {
	animes: AnimeData[];
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

export function useAnimes(options: UseAnimesOptions = {}): UseAnimesReturn {
	const {
		filters = {},
		sorting = { sortBy: "title", sortOrder: "asc" },
		pagination = { page: 1, limit: 20 }, // デフォルト値を削減
		enabled = true,
		loadAll = false,
	} = options;
	const [animes, setAnimes] = useState<AnimeData[]>([]);
	const [loading, setLoading] = useState(false); // 初期状態はfalseに変更
	const [error, setError] = useState<string | null>(null);
	const [paginationInfo, setPaginationInfo] = useState({
		page: pagination.page,
		limit: pagination.limit,
		total: 0,
		totalPages: 0,
	});
	// 前回のパラメータをキャッシュして無限ループを防ぐ
	const lastParamsRef = useRef<string>("");

	// URLパラメータを構築
	const searchParams = useMemo(() => {
		const params = new URLSearchParams();

		// 明示的な一覧読み込みフラグ
		if (loadAll) {
			params.set("loadAll", "true");
		}

		if (filters.search && filters.search.trim().length >= 2) {
			params.set("search", filters.search.trim());
		}
		if (filters.genre) params.set("genre", filters.genre);
		if (filters.year) params.set("year", filters.year);

		params.set("sortBy", sorting.sortBy);
		params.set("sortOrder", sorting.sortOrder);
		params.set("page", pagination.page.toString());
		params.set("limit", pagination.limit.toString());
		return params.toString();
	}, [
		loadAll,
		filters.search,
		filters.genre,
		filters.year,
		sorting.sortBy,
		sorting.sortOrder,
		pagination.page,
		pagination.limit,
	]);

	// データを取得する関数
	const fetchAnimes = useCallback(async () => {
		if (!enabled) return;

		// 検索条件もloadAllフラグもない場合は何もしない
		const hasSearchConditions = 
			(filters.search && filters.search.trim().length >= 2) ||
			filters.genre || 
			filters.year ||
			loadAll;

		if (!hasSearchConditions) {
			setAnimes([]);
			setPaginationInfo({
				page: 1,
				limit: pagination.limit,
				total: 0,
				totalPages: 0,
			});
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`${API.ENDPOINTS.ANIMES}?${searchParams}`, {
				signal: AbortSignal.timeout(API.TIMEOUT),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			setAnimes(data.animes || []);
			setPaginationInfo(
				data.pagination || {
					page: 1,
					limit: pagination.limit,
					total: 0,
					totalPages: 0,
				},
			);
		} catch (err) {
			console.error("Failed to fetch animes:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setAnimes([]);
			setPaginationInfo({
				page: 1,
				limit: pagination.limit,
				total: 0,
				totalPages: 0,
			});		} finally {
			setLoading(false);
		}
	}, [enabled, searchParams, filters.search, filters.genre, filters.year, loadAll, pagination.limit]);

	// 初期化とパラメータ変更時にデータを取得
	useEffect(() => {
		// パラメータが変更された場合のみフェッチ
		if (lastParamsRef.current !== searchParams) {
			lastParamsRef.current = searchParams;
			fetchAnimes();
		}
	}, [fetchAnimes, searchParams]);

	// 再フェッチ用の安定した関数
	const refetch = useCallback(async () => {
		// 強制的に再フェッチ
		lastParamsRef.current = "";
		await fetchAnimes();
	}, [fetchAnimes]);

	// ページネーション情報を計算
	const hasNextPage = paginationInfo.page < paginationInfo.totalPages;
	const hasPrevPage = paginationInfo.page > 1;

	return {
		animes,
		loading,
		error,
		pagination: paginationInfo,
		refetch,
		hasNextPage,
		hasPrevPage,
	};
}
