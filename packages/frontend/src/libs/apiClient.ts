"use client";

import type { VideoFileData } from "@/type";
import { createApiUrl } from "@/utils/api";

interface APIClientOptions {
	isOffline: boolean;
}

class APIClient {
	private isOffline: boolean;

	constructor(options: APIClientOptions) {
		this.isOffline = options.isOffline;
	}

	async getVideos(): Promise<VideoFileData[]> {
		if (this.isOffline) {
			// オフライン時はIndexedDBから取得
			const { getOfflineVideos } = await import(
				"@/services/offlineStorageService"
			);
			return getOfflineVideos();
		}

		// オンライン時はAPIから取得
		const response = await fetch(createApiUrl("/videos"));
		if (!response.ok) {
			throw new Error("動画の取得に失敗しました");
		}
		return response.json();
	}

	async getVideoStream(videoId: string, filePath?: string): Promise<string> {
		if (this.isOffline) {
			// オフライン時はIndexedDBから取得
			if (!filePath) {
				throw new Error("filePath is required for offline mode");
			}
			const { getOfflineVideoBlob } = await import(
				"@/services/offlineStorageService"
			);
			const blob = await getOfflineVideoBlob(filePath);
			return URL.createObjectURL(blob);
		}

		// オンライン時はストリーミングURL
		return createApiUrl(`/video/${encodeURIComponent(videoId)}`);
	}

	async saveProgress(filePath: string, progress: number): Promise<void> {
		if (this.isOffline) {
			// オフライン時はIndexedDBに保存
			const { saveOfflineProgress } = await import(
				"@/services/offlineStorageService"
			);
			await saveOfflineProgress(filePath, progress);
			return;
		}

		// オンライン時はAPIに送信
		const response = await fetch(createApiUrl("/progress"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ filePath, progress }),
		});

		if (!response.ok) {
			throw new Error("進行状況の保存に失敗しました");
		}
	}

	async getProgress(filePath: string): Promise<number> {
		if (this.isOffline) {
			// オフライン時はIndexedDBから取得
			const { getOfflineProgress } = await import(
				"@/services/offlineStorageService"
			);
			return await getOfflineProgress(filePath);
		}

		// オンライン時はAPIから取得
		const response = await fetch(
			createApiUrl(`/progress?filePath=${encodeURIComponent(filePath)}`),
		);
		if (!response.ok) {
			return 0;
		}
		const data = await response.json();
		return data.progress || 0;
	}
}

export const createAPIClient = (isOffline: boolean) => {
	return new APIClient({ isOffline });
};
