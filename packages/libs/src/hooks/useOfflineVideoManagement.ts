"use client";

import { useState, useCallback, useEffect } from "react";
import { createAPIClient } from "../libs/apiClient";
import type { VideoFileData } from "../type";
import type { TabType } from "../stores/appStateStore";

interface UseOfflineVideoManagementProps {
	activeTab: TabType;
	clearCache: () => Promise<void>;
	refreshCachedVideos: () => Promise<void>;
}

export function useOfflineVideoManagement({
	activeTab,
	clearCache,
	refreshCachedVideos,
}: UseOfflineVideoManagementProps) {
	const [offlineVideos, setOfflineVideos] = useState<VideoFileData[]>([]);

	const loadOfflineVideos = useCallback(async () => {
		if (activeTab !== "offline") return;

		try {
			const apiClient = createAPIClient(true);
			const videos = await apiClient.getVideos();
			setOfflineVideos(videos);
		} catch (error) {
			console.error("オフライン動画の取得に失敗:", error);
		}
	}, [activeTab]);

	useEffect(() => {
		if (activeTab === "offline") {
			loadOfflineVideos();
		}
	}, [activeTab, loadOfflineVideos]);

	const handleOfflineVideoDelete = useCallback(async () => {
		await refreshCachedVideos();
	}, [refreshCachedVideos]);

	const handleClearAllOffline = useCallback(async () => {
		if (
			window.confirm(
				"すべてのオフライン動画を削除しますか？この操作は元に戻せません。",
			)
		) {
			try {
				await clearCache();
				await refreshCachedVideos();
			} catch (error) {
				console.error("Failed to clear offline cache:", error);
			}
		}
	}, [clearCache, refreshCachedVideos]);

	return {
		offlineVideos,
		handleOfflineVideoDelete,
		handleClearAllOffline,
		loadOfflineVideos,
	};
}
