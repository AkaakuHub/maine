"use client";

import { useCallback, useEffect, useState } from "react";

const RECENT_SEARCHES_STORAGE_KEY = "maine:recent-searches";
const MAX_RECENT_SEARCHES = 8;

interface RecentSearchItem {
	query: string;
	searchedAt: string;
}

export function useRecentSearches() {
	const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		try {
			const saved = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
			if (!saved) {
				return;
			}

			const parsed = JSON.parse(saved) as RecentSearchItem[];
			if (!Array.isArray(parsed)) {
				return;
			}

			setRecentSearches(
				parsed
					.filter((item) => typeof item.query === "string")
					.slice(0, MAX_RECENT_SEARCHES),
			);
		} catch {
			setRecentSearches([]);
		}
	}, []);

	const persistSearches = useCallback((nextSearches: RecentSearchItem[]) => {
		setRecentSearches(nextSearches);

		if (typeof window === "undefined") {
			return;
		}

		try {
			window.localStorage.setItem(
				RECENT_SEARCHES_STORAGE_KEY,
				JSON.stringify(nextSearches),
			);
		} catch {
			// localStorageが使えない環境ではメモリ内だけに保持
		}
	}, []);

	const addRecentSearch = useCallback(
		(rawQuery: string) => {
			const query = rawQuery.trim();
			if (query.length < 2) {
				return;
			}

			const nextSearches = [
				{
					query,
					searchedAt: new Date().toISOString(),
				},
				...recentSearches.filter((item) => item.query !== query),
			].slice(0, MAX_RECENT_SEARCHES);

			persistSearches(nextSearches);
		},
		[persistSearches, recentSearches],
	);

	const removeRecentSearch = useCallback(
		(query: string) => {
			persistSearches(recentSearches.filter((item) => item.query !== query));
		},
		[persistSearches, recentSearches],
	);

	return {
		recentSearches,
		addRecentSearch,
		removeRecentSearch,
	};
}
