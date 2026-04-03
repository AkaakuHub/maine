import { useEffect } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useChapterSkipStore } from "../stores/chapterSkipStore";

interface UseChapterSkipRulesOptions {
	enabled: boolean;
}

export function useChapterSkipRules({
	enabled,
}: UseChapterSkipRulesOptions): void {
	const { isAuthenticated } = useAuthStore();
	const chapterSkipStore = useChapterSkipStore();

	useEffect(() => {
		if (!enabled) {
			return;
		}

		if (!isAuthenticated) {
			chapterSkipStore.clearRules();
			return;
		}

		void chapterSkipStore.fetchRules();
	}, [chapterSkipStore, enabled, isAuthenticated]);
}
