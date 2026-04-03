import { useCallback, useState } from "react";
import type { ProgressData, UpdateProgressParams } from "../types/progress";
import {
	loadVideoProgress,
	saveVideoProgress,
} from "../application/services/progress-service";

interface UseProgressReturn {
	updateProgress: (
		params: UpdateProgressParams,
	) => Promise<ProgressData | null>;
	getProgress: (filePath: string) => Promise<ProgressData | null>;
	loading: boolean;
	error: string | null;
}

export function useProgress(): UseProgressReturn {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const updateProgress = useCallback(
		async (params: UpdateProgressParams): Promise<ProgressData | null> => {
			try {
				setLoading(true);
				setError(null);
				return await saveVideoProgress(params);
			} catch (err) {
				console.error("Failed to update progress:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const getProgress = useCallback(
		async (filePath: string): Promise<ProgressData | null> => {
			try {
				setLoading(true);
				setError(null);
				return await loadVideoProgress(filePath);
			} catch (err) {
				console.error("Failed to get progress:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	return {
		updateProgress,
		getProgress,
		loading,
		error,
	};
}
