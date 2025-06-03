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

			console.log("[useDatabaseUpdate] Starting database update...");

			const response = await fetch(API.ENDPOINTS.UPDATE_DATABASE, {
				method: "GET",
				signal: AbortSignal.timeout(API.TIMEOUT),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorData;
				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = { error: `HTTP error! status: ${response.status}` };
				}
				throw new Error(
					errorData.error || `HTTP error! status: ${response.status}`,
				);
			}

			const responseText = await response.text();
			if (!responseText) {
				throw new Error("Empty response from server");
			}

			let data;
			try {
				data = JSON.parse(responseText);
			} catch (parseError) {
				console.error("JSON parse error:", parseError, "Response:", responseText);
				throw new Error("Invalid JSON response from server");
			}

			console.log("[useDatabaseUpdate] Update completed:", data);

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
