import { useState, useEffect, useCallback } from "react";

export interface ChapterSkipRule {
	id: string;
	pattern: string;
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface ChapterSkipSettings {
	rules: ChapterSkipRule[];
	isLoading: boolean;
	error: string | null;
}

export interface ChapterSkipActions {
	addRule: (pattern: string, enabled?: boolean) => Promise<void>;
	updateRule: (
		id: string,
		updates: { pattern?: string; enabled?: boolean },
	) => Promise<void>;
	deleteRule: (id: string) => Promise<void>;
	toggleRule: (id: string) => Promise<void>;
	refreshRules: () => Promise<void>;
}

export function useChapterSkipSettings(): ChapterSkipSettings &
	ChapterSkipActions {
	const [rules, setRules] = useState<ChapterSkipRule[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// ルール一覧を取得
	const fetchRules = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch("/api/settings/chapter-skip");
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch chapter skip rules");
			}

			setRules(data.data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			console.error("Failed to fetch chapter skip rules:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// 初期読み込み
	useEffect(() => {
		fetchRules();
	}, [fetchRules]);

	// ルール追加
	const addRule = useCallback(
		async (pattern: string, enabled = true) => {
			try {
				setError(null);

				const response = await fetch("/api/settings/chapter-skip", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ pattern, enabled }),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to add chapter skip rule");
				}

				await fetchRules(); // リストを更新
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
				throw err;
			}
		},
		[fetchRules],
	);

	// ルール更新
	const updateRule = useCallback(
		async (id: string, updates: { pattern?: string; enabled?: boolean }) => {
			try {
				setError(null);

				const response = await fetch("/api/settings/chapter-skip", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id, ...updates }),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to update chapter skip rule");
				}

				await fetchRules(); // リストを更新
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
				throw err;
			}
		},
		[fetchRules],
	);

	// ルール削除
	const deleteRule = useCallback(
		async (id: string) => {
			try {
				setError(null);

				const response = await fetch(
					`/api/settings/chapter-skip?id=${encodeURIComponent(id)}`,
					{
						method: "DELETE",
					},
				);

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to delete chapter skip rule");
				}

				await fetchRules(); // リストを更新
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
				throw err;
			}
		},
		[fetchRules],
	);

	// ルール有効/無効切り替え
	const toggleRule = useCallback(
		async (id: string) => {
			const rule = rules.find((r) => r.id === id);
			if (!rule) return;

			await updateRule(id, { enabled: !rule.enabled });
		},
		[rules, updateRule],
	);

	// ルール再取得
	const refreshRules = useCallback(async () => {
		await fetchRules();
	}, [fetchRules]);

	return {
		rules,
		isLoading,
		error,
		addRule,
		updateRule,
		deleteRule,
		toggleRule,
		refreshRules,
	};
}
