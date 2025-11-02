import { useCallback, useState } from "react";
import { AuthAPI } from "../api/auth";
import type { ProgressData, UpdateProgressParams } from "../types/progress";
import { createApiUrl } from "../utils/api";

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

				console.log("Sending progress update request:", params);
				const url = createApiUrl("/progress");
				console.log("Request URL:", url);

				const response = await fetch(url, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...AuthAPI.getAuthHeaders(),
					},
					body: JSON.stringify(params),
					signal: AbortSignal.timeout(30000),
				});

				console.log("Response status:", response.status, response.statusText);

				if (!response.ok) {
					const errorText = await response.text();
					console.error("HTTP error response:", errorText);
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();
				console.log("Response data:", result);

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

				console.log("Getting progress for:", filePath);
				const url = createApiUrl(
					`/progress?filePath=${encodeURIComponent(filePath)}`,
				);
				console.log("Get progress URL:", url);

				const response = await fetch(url, {
					headers: AuthAPI.getAuthHeaders(),
					signal: AbortSignal.timeout(30000),
				});

				console.log("Get progress response status:", response.status);

				if (!response.ok) {
					const errorText = await response.text();
					console.error("Get progress HTTP error:", errorText);
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();
				console.log("Get progress response data:", result);

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
