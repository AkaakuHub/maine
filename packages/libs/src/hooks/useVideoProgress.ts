import { useCallback, useEffect, useRef } from "react";
import type { VideoProgressData } from "../types/progress";
import { useBeforeUnload } from "./useBeforeUnload";
import { useProgress } from "./useProgress";

interface UseVideoProgressOptions {
	filePath: string;
	enableBackup?: boolean;
	onProgressSaved?: (data: VideoProgressData) => void;
}

// 定期的進捗保存の設定
const AUTO_SAVE_INTERVAL = 30000; // 30秒ごとに保存
const AUTO_SAVE_PROGRESS_THRESHOLD = 5; // 5%以上進んだら保存
const SEEK_THRESHOLD = 5; // 5秒以上のシークで即時保存

export function useVideoProgress({
	filePath,
	enableBackup = true,
	onProgressSaved,
}: UseVideoProgressOptions) {
	const { updateProgress, getProgress, loading, error } = useProgress();

	// 定期保存用のref
	const lastSavedTimeRef = useRef<number>(0);
	const lastSavedProgressRef = useRef<number>(0);
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

	// useBeforeUnloadフックで離脱時保存を処理
	const {
		updateProgressData,
		markAsSaved,
		restoreFromBackup,
		sendProgressWithFetch,
		hasUnsavedChanges,
	} = useBeforeUnload({
		enableLocalStorageBackup: enableBackup,
	});

	// 初期化時にバックアップを復元して送信
	useEffect(() => {
		const restoreAndSendBackup = async () => {
			const backupData = restoreFromBackup();
			if (backupData && backupData.filePath === filePath) {
				try {
					await sendProgressWithFetch(backupData);
				} catch (error) {
					console.error("Error sending backup progress:", error);
				}
			}
		};

		restoreAndSendBackup();
	}, [filePath, restoreFromBackup, sendProgressWithFetch]);

	// 定期的進捗保存関数
	const autoSaveProgress = useCallback(
		async (progressData: VideoProgressData) => {
			const currentTime = progressData.watchTime || 0;
			const currentProgress = progressData.watchProgress || 0;
			const lastSavedTime = lastSavedTimeRef.current;
			const lastSavedProgress = lastSavedProgressRef.current;

			// 保存条件のチェック
			const timeDiff = Math.abs(currentTime - lastSavedTime);
			const progressDiff = Math.abs(currentProgress - lastSavedProgress);
			const shouldSaveByTime = timeDiff >= AUTO_SAVE_INTERVAL / 1000; // 30秒以上経過
			const shouldSaveByProgress = progressDiff >= AUTO_SAVE_PROGRESS_THRESHOLD; // 5%以上進捗
			const shouldSaveBySeek = timeDiff >= SEEK_THRESHOLD; // 5秒以上のシーク操作

			// 保存条件が満たされた場合の詳細ログ
			if (shouldSaveByTime || shouldSaveByProgress || shouldSaveBySeek) {
				try {
					const result = await updateProgress(progressData);
					if (result) {
						lastSavedTimeRef.current = currentTime;
						lastSavedProgressRef.current = currentProgress;
						markAsSaved();

						if (onProgressSaved) {
							onProgressSaved(progressData);
						}
					} else {
						console.warn("Progress save returned null/falsy");
					}
				} catch (error) {
					console.error("Auto save progress failed:", error);
				}
			}
		},
		[updateProgress, markAsSaved, onProgressSaved],
	);

	// 定期保存タイマーのクリーンアップ
	useEffect(() => {
		return () => {
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
			}
		};
	}, []);

	// 時間更新ハンドラー（ModernVideoPlayerから呼ばれる）
	const handleTimeUpdate = useCallback(
		(currentTime: number, duration: number) => {
			if (!filePath || !duration) return;

			const progress = Math.min(
				100,
				Math.max(0, (currentTime / duration) * 100),
			);

			const progressData: VideoProgressData = {
				filePath,
				watchTime: currentTime,
				watchProgress: progress,
			};

			// 離脱時保存用のデータを更新
			updateProgressData(progressData);

			// 定期的進捗保存を実行（非同期でバックグラウンドで実行）
			autoSaveProgress(progressData).catch((error) => {
				console.error("Auto save failed in handleTimeUpdate:", error);
			});
		},
		[filePath, updateProgressData, autoSaveProgress],
	);

	// Like状態を更新する関数
	const updateLikeStatus = useCallback(
		async (isLiked: boolean): Promise<boolean> => {
			const progressData: VideoProgressData = {
				filePath,
				isLiked,
			};

			// Like状態は即座に保存（間隔制限なし）
			try {
				const result = await updateProgress(progressData);

				if (result) {
					updateProgressData(progressData);
					markAsSaved();

					if (onProgressSaved) {
						onProgressSaved(progressData);
					}

					return true;
				}

				return false;
			} catch (error) {
				console.error("Failed to update like status:", error);
				// 失敗した場合も離脱時保存用のデータは更新
				updateProgressData(progressData);
				return false;
			}
		},
		[
			filePath,
			updateProgress,
			updateProgressData,
			markAsSaved,
			onProgressSaved,
		],
	);

	// 初回進捗読み込み関数
	const loadInitialProgress =
		useCallback(async (): Promise<VideoProgressData | null> => {
			if (!filePath) return null;
			try {
				const progressData = await getProgress(filePath);
				if (progressData) {
					// VideoProgressData型に変換
					const videoProgressData: VideoProgressData = {
						filePath: progressData.filePath,
						watchTime: progressData.watchTime ?? 0,
						watchProgress: progressData.watchProgress,
						isLiked: progressData.isLiked,
					};

					// 最終保存時間と進捗を初期化
					lastSavedTimeRef.current = videoProgressData.watchTime ?? 0;
					lastSavedProgressRef.current = videoProgressData.watchProgress ?? 0;
					return videoProgressData;
				}
			} catch (error) {
				console.error("Failed to load initial progress:", error);
			}
			return null;
		}, [filePath, getProgress]);

	return {
		// 主要な関数
		handleTimeUpdate,
		updateLikeStatus,
		getProgress,
		loadInitialProgress,

		// 状態
		loading,
		error,
		hasUnsavedChanges,
	};
}
