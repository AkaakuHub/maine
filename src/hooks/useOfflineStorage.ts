"use client";

import { useState, useEffect, useCallback } from "react";
import {
	offlineStorageService,
	type CachedVideo,
	type DownloadProgress,
} from "@/services/offlineStorageService";

export interface UseOfflineStorageReturn {
	cachedVideos: CachedVideo[];
	isDownloading: Record<string, boolean>;
	downloadProgress: Record<string, DownloadProgress>;
	cacheSize: number;
	storageEstimate: { usage: number; quota: number } | null;
	downloadVideo: (filePath: string, title: string) => Promise<void>;
	deleteVideo: (filePath: string) => Promise<void>;
	clearCache: () => Promise<void>;
	getCachedVideoUrl: (filePath: string) => Promise<string | null>;
	revokeCachedVideoUrl: (url: string) => void;
	isCached: (filePath: string) => boolean;
	refreshCachedVideos: () => Promise<void>;
	cancelDownload: (filePath: string) => void;
}

export function useOfflineStorage(): UseOfflineStorageReturn {
	const [cachedVideos, setCachedVideos] = useState<CachedVideo[]>([]);
	const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>(
		{},
	);
	const [downloadProgress, setDownloadProgress] = useState<
		Record<string, DownloadProgress>
	>({});
	const [cacheSize, setCacheSize] = useState<number>(0);
	const [storageEstimate, setStorageEstimate] = useState<{
		usage: number;
		quota: number;
	} | null>(null);
	const [abortControllers, setAbortControllers] = useState<
		Record<string, AbortController>
	>({});

	// キャッシュされた動画一覧を取得
	const refreshCachedVideos = useCallback(async () => {
		try {
			const videos = await offlineStorageService.getAllCachedVideos();
			setCachedVideos(videos);

			const size = await offlineStorageService.getCacheSize();
			setCacheSize(size);
		} catch (error) {
			console.error("Failed to refresh cached videos:", error);
		}
	}, []);

	// ストレージ使用量を取得
	const refreshStorageEstimate = useCallback(async () => {
		try {
			const estimate = await offlineStorageService.getStorageEstimate();
			setStorageEstimate(estimate);
		} catch (error) {
			console.error("Failed to get storage estimate:", error);
		}
	}, []);

	// 動画をダウンロードしてキャッシュ
	const downloadVideo = useCallback(
		async (filePath: string, title: string) => {
			if (isDownloading[filePath]) {
				throw new Error("この動画は既にダウンロード中です");
			}

			const abortController = new AbortController();

			setAbortControllers((prev) => ({ ...prev, [filePath]: abortController }));
			setIsDownloading((prev) => ({ ...prev, [filePath]: true }));
			setDownloadProgress((prev) => ({
				...prev,
				[filePath]: { loaded: 0, total: 0, percentage: 0 },
			}));

			try {
				await offlineStorageService.downloadAndCache(
					filePath,
					title,
					(progress) => {
						setDownloadProgress((prev) => ({ ...prev, [filePath]: progress }));
					},
					abortController.signal,
				);

				// ダウンロード完了後にリストを更新
				await refreshCachedVideos();
				await refreshStorageEstimate();
			} catch (error) {
				console.error("Failed to download video:", error);
				throw error;
			} finally {
				setIsDownloading((prev) => {
					const updated = { ...prev };
					delete updated[filePath];
					return updated;
				});
				setDownloadProgress((prev) => {
					const updated = { ...prev };
					delete updated[filePath];
					return updated;
				});
				setAbortControllers((prev) => {
					const updated = { ...prev };
					delete updated[filePath];
					return updated;
				});
			}
		},
		[isDownloading, refreshCachedVideos, refreshStorageEstimate],
	);

	// ダウンロードをキャンセル
	const cancelDownload = useCallback(
		(filePath: string) => {
			const controller = abortControllers[filePath];
			if (controller) {
				controller.abort();
			}
		},
		[abortControllers],
	);

	// キャッシュされた動画を削除
	const deleteVideo = useCallback(
		async (filePath: string) => {
			try {
				await offlineStorageService.deleteCachedVideo(filePath);
				await refreshCachedVideos();
				await refreshStorageEstimate();
			} catch (error) {
				console.error("Failed to delete video:", error);
				throw error;
			}
		},
		[refreshCachedVideos, refreshStorageEstimate],
	);

	// 全キャッシュをクリア
	const clearCache = useCallback(async () => {
		try {
			await offlineStorageService.clearAllCache();
			await refreshCachedVideos();
			await refreshStorageEstimate();
		} catch (error) {
			console.error("Failed to clear cache:", error);
			throw error;
		}
	}, [refreshCachedVideos, refreshStorageEstimate]);

	// キャッシュされた動画のURLを取得
	const getCachedVideoUrl = useCallback(
		async (filePath: string): Promise<string | null> => {
			try {
				const cachedVideo =
					await offlineStorageService.getCachedVideo(filePath);
				if (cachedVideo) {
					return offlineStorageService.createObjectURL(cachedVideo.blob);
				}
				return null;
			} catch (error) {
				console.error("Failed to get cached video URL:", error);
				return null;
			}
		},
		[],
	);

	// オブジェクトURLを解放
	const revokeCachedVideoUrl = useCallback((url: string) => {
		offlineStorageService.revokeObjectURL(url);
	}, []);

	// 動画がキャッシュされているかチェック
	const isCached = useCallback(
		(filePath: string): boolean => {
			return cachedVideos.some((video) => video.filePath === filePath);
		},
		[cachedVideos],
	);

	// 初期化
	useEffect(() => {
		refreshCachedVideos();
		refreshStorageEstimate();
	}, [refreshCachedVideos, refreshStorageEstimate]);

	// クリーンアップ（ダウンロード中断）
	useEffect(() => {
		return () => {
			Object.values(abortControllers).forEach((controller) => {
				controller.abort();
			});
		};
	}, [abortControllers]);

	return {
		cachedVideos,
		isDownloading,
		downloadProgress,
		cacheSize,
		storageEstimate,
		downloadVideo,
		deleteVideo,
		clearCache,
		getCachedVideoUrl,
		revokeCachedVideoUrl,
		isCached,
		refreshCachedVideos,
		cancelDownload,
	};
}
