import { useState, useCallback } from "react";
import { API } from "@/utils/constants";

export interface DatabaseUpdateStats {
	total: number;
	added: number;
	updated: number;
	deleted: number;
	scanned: number;
}

export interface UseDatabaseUpdateReturn {
	updating: boolean;
	error: string | null;
	stats: DatabaseUpdateStats | null;
	updateDatabase: () => Promise<boolean>;
	clearError: () => void;
}

export function useDatabaseUpdate(): UseDatabaseUpdateReturn {
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [stats, setStats] = useState<DatabaseUpdateStats | null>(null);

	const updateDatabase = useCallback(async (): Promise<boolean> => {
		try {
			setUpdating(true);
			setError(null);
			setStats(null);

			const response = await fetch(API.ENDPOINTS.UPDATE_DATABASE, {
				method: "GET",
				signal: AbortSignal.timeout(API.TIMEOUT),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `HTTP error! status: ${response.status}`,
				);
			}

			const data = await response.json();

			if (data.stats) {
				setStats(data.stats);
			}

			return true;
		} catch (err) {
			console.error("Database update failed:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			return false;
		} finally {
			setUpdating(false);
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		updating,
		error,
		stats,
		updateDatabase,
		clearError,
	};
}
