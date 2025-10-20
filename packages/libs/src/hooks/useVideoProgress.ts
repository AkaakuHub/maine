import { useCallback, useEffect } from "react";
import { useProgress } from "./useProgress";
import { useBeforeUnload } from "./useBeforeUnload";
import type { VideoProgressData } from "../types/progress";

interface UseVideoProgressOptions {
	filePath: string;
	enableBackup?: boolean;
	onProgressSaved?: (data: VideoProgressData) => void;
}

export function useVideoProgress({
	filePath,
	enableBackup = true,
	onProgressSaved,
}: UseVideoProgressOptions) {
	const { updateProgress, getProgress, loading, error } = useProgress();

	// useBeforeUnloadフックで離脱時保存を処理
	const {
		updateProgressData,
		markAsSaved,
		restoreFromBackup,
		sendProgressWithFetch,
		hasUnsavedChanges,
	} = useBeforeUnload({
		enableLocalStorageBackup: enableBackup,
		onBeforeUnload: (data) => {
			console.log("Saving progress on page unload:", data);
		},
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

			// 離脱時保存用のデータのみ更新（API送信なし）
			updateProgressData(progressData);
		},
		[filePath, updateProgressData],
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

	return {
		// 主要な関数
		handleTimeUpdate,
		updateLikeStatus,
		getProgress,

		// 状態
		loading,
		error,
		hasUnsavedChanges,
	};
}
