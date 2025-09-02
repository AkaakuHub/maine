import { create } from "zustand";

export interface ChapterSkipRule {
	id: string;
	pattern: string;
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

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

			const response = await fetch("/api/settings/chapter-skip");
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch chapter skip rules");
			}

			set({ rules: data.data, isLoading: false });
		} catch (err) {
			const error = err instanceof Error ? err.message : "Unknown error";
			set({ error, isLoading: false });
			console.error("Failed to fetch chapter skip rules:", err);
		}
	},

	addRule: async (pattern: string, enabled = true) => {
		try {
			set({ error: null });

			const response = await fetch("/api/settings/chapter-skip", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pattern, enabled }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add chapter skip rule");
			}

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

			const response = await fetch("/api/settings/chapter-skip", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id, ...updates }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to update chapter skip rule");
			}

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

// 初期データ読み込み
useChapterSkipStore.getState().fetchRules();
