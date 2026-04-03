import { create } from "zustand";
import type { ChapterSkipRule } from "../types/Settings";
import {
	createChapterSkipRule,
	deleteChapterSkipRule,
	fetchChapterSkipRules,
	updateChapterSkipRule,
} from "../application/services/scan-service";

interface ChapterSkipStore {
	rules: ChapterSkipRule[];
	isLoading: boolean;
	error: string | null;
	fetchRules: () => Promise<void>;
	addRule: (pattern: string, enabled?: boolean) => Promise<void>;
	updateRule: (
		id: string,
		updates: { pattern?: string; enabled?: boolean },
	) => Promise<void>;
	deleteRule: (id: string) => Promise<void>;
	toggleRule: (id: string) => Promise<void>;
}

export const useChapterSkipStore = create<ChapterSkipStore>((set, get) => ({
	rules: [],
	isLoading: true,
	error: null,

	fetchRules: async () => {
		try {
			set({ isLoading: true, error: null });
			const rules = await fetchChapterSkipRules();
			set({ rules, isLoading: false });
		} catch (err) {
			const error = err instanceof Error ? err.message : "Unknown error";
			set({ error, isLoading: false });
			console.error("Failed to fetch chapter skip rules:", err);
		}
	},

	addRule: async (pattern: string, enabled = true) => {
		try {
			set({ error: null });
			await createChapterSkipRule({ pattern, enabled });

			await get().fetchRules();
		} catch (err) {
			const error = err instanceof Error ? err.message : "Unknown error";
			set({ error });
			throw err;
		}
	},

	updateRule: async (
		id: string,
		updates: { pattern?: string; enabled?: boolean },
	) => {
		try {
			set({ error: null });
			await updateChapterSkipRule(id, updates);

			await get().fetchRules();
		} catch (err) {
			const error = err instanceof Error ? err.message : "Unknown error";
			set({ error });
			throw err;
		}
	},

	deleteRule: async (id: string) => {
		try {
			set({ error: null });
			await deleteChapterSkipRule(id);

			await get().fetchRules();
		} catch (err) {
			const error = err instanceof Error ? err.message : "Unknown error";
			set({ error });
			throw err;
		}
	},

	toggleRule: async (id: string) => {
		const { rules, updateRule } = get();
		const rule = rules.find((r) => r.id === id);
		if (!rule) return;

		await updateRule(id, { enabled: !rule.enabled });
	},
}));

// 初期データ読み込み（クライアントサイドのみ）
if (typeof window !== "undefined") {
	useChapterSkipStore.getState().fetchRules();
}
