import { useState, useCallback } from "react";
import { API } from "@/utils/constants";

interface UpdateProgressParams {
	filePath: string;
	watchTime?: number;
	watchProgress?: number;
	isLiked?: boolean;
}

interface ProgressData {
	filePath: string;
	watchTime?: number | null;
	watchProgress: number;
	isLiked: boolean;
	likedAt?: Date | null;
	lastWatched?: Date | null;
}

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

				const response = await fetch(API.ENDPOINTS.PROGRESS, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(params),
					signal: AbortSignal.timeout(API.TIMEOUT),
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || "Failed to update progress");
				}

				return result.data;
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

				const response = await fetch(
					`${API.ENDPOINTS.PROGRESS}?filePath=${encodeURIComponent(filePath)}`,
					{
						signal: AbortSignal.timeout(API.TIMEOUT),
					},
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || "Failed to get progress");
				}

				return result.data;
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
