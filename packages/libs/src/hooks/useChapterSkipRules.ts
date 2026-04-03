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
	const fetchRules = useChapterSkipStore((state) => state.fetchRules);
	const clearRules = useChapterSkipStore((state) => state.clearRules);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		if (!isAuthenticated) {
			clearRules();
			return;
		}

		void fetchRules();
	}, [clearRules, enabled, fetchRules, isAuthenticated]);
}
