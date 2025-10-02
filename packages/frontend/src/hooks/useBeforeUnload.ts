import { useEffect, useCallback, useRef } from "react";
import { createApiUrl } from "@/utils/api";

interface ProgressData {
	filePath: string;
	watchTime?: number;
	watchProgress?: number;
	isLiked?: boolean;
}

interface UseBeforeUnloadOptions {
	onBeforeUnload?: (data: ProgressData) => void;
	enableLocalStorageBackup?: boolean;
}

export function useBeforeUnload(options: UseBeforeUnloadOptions = {}) {
	const { onBeforeUnload, enableLocalStorageBackup = true } = options;
	const lastProgressDataRef = useRef<ProgressData | null>(null);
	const hasUnsavedChangesRef = useRef(false);

	// 進捗データを更新する関数
	const updateProgressData = useCallback(
		(data: ProgressData) => {
			lastProgressDataRef.current = data;
			hasUnsavedChangesRef.current = true;

			// LocalStorageにバックアップ保存
			if (enableLocalStorageBackup) {
				try {
					localStorage.setItem(
						"video-progress-backup",
						JSON.stringify({
							...data,
							timestamp: Date.now(),
						}),
					);
				} catch (error) {
					console.warn(
						"Failed to save progress backup to localStorage:",
						error,
					);
				}
			}
		},
		[enableLocalStorageBackup],
	);

	// sendBeacon APIで確実に進捗を送信する関数
	const sendProgressWithBeacon = useCallback((data: ProgressData): boolean => {
		try {
			const blob = new Blob([JSON.stringify(data)], {
				type: "application/json",
			});

			return navigator.sendBeacon(createApiUrl("/progress"), blob);
		} catch (error) {
			console.error("Failed to send progress with sendBeacon:", error);
			return false;
		}
	}, []);

	// 通常のfetch APIで進捗を送信する関数（フォールバック）
	const sendProgressWithFetch = useCallback(
		async (data: ProgressData): Promise<boolean> => {
			try {
				const response = await fetch(createApiUrl("/progress"), {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(data),
					keepalive: true, // ページ離脱時でも送信継続
				});

				return response.ok;
			} catch (error) {
				console.error("Failed to send progress with fetch:", error);
				return false;
			}
		},
		[],
	);

	// 進捗保存を実行する関数
	const saveProgressOnUnload = useCallback(() => {
		const data = lastProgressDataRef.current;
		if (!data || !hasUnsavedChangesRef.current) return;

		// カスタムコールバックを実行
		if (onBeforeUnload) {
			onBeforeUnload(data);
		}

		// sendBeacon APIで送信を試行
		const beaconSent = sendProgressWithBeacon(data);

		if (beaconSent) {
			hasUnsavedChangesRef.current = false;

			// 成功した場合はLocalStorageバックアップを削除
			if (enableLocalStorageBackup) {
				try {
					localStorage.removeItem("video-progress-backup");
				} catch (error) {
					console.warn("Failed to remove progress backup:", error);
				}
			}
		}
	}, [onBeforeUnload, sendProgressWithBeacon, enableLocalStorageBackup]);

	// 保存されていない変更があるかチェック
	const markAsSaved = useCallback(() => {
		hasUnsavedChangesRef.current = false;
	}, []);

	// LocalStorageからバックアップを復元する関数
	const restoreFromBackup = useCallback((): ProgressData | null => {
		if (!enableLocalStorageBackup) return null;

		try {
			const backup = localStorage.getItem("video-progress-backup");
			if (!backup) return null;

			const data = JSON.parse(backup);

			// 5分以上古いバックアップは無視
			if (Date.now() - data.timestamp > 5 * 60 * 1000) {
				localStorage.removeItem("video-progress-backup");
				return null;
			}

			// timestampを除去してProgressDataを返す
			const { timestamp, ...progressData } = data;
			return progressData;
		} catch (error) {
			console.warn("Failed to restore progress backup:", error);
			return null;
		}
	}, [enableLocalStorageBackup]);

	useEffect(() => {
		// beforeunloadイベントリスナー
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			saveProgressOnUnload();

			// 保存されていない変更がある場合は確認ダイアログを表示
			if (hasUnsavedChangesRef.current) {
				event.preventDefault();
				event.returnValue = ""; // Chrome requires returnValue to be set
			}
		};

		// pagehideイベントリスナー（モバイル対応）
		const handlePageHide = () => {
			saveProgressOnUnload();
		};

		// visibilitychangeイベントリスナー（タブの非表示検知）
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				saveProgressOnUnload();
			}
		};

		// イベントリスナーを登録
		window.addEventListener("beforeunload", handleBeforeUnload);
		window.addEventListener("pagehide", handlePageHide);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			// クリーンアップ
			window.removeEventListener("beforeunload", handleBeforeUnload);
			window.removeEventListener("pagehide", handlePageHide);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [saveProgressOnUnload]);

	return {
		updateProgressData,
		markAsSaved,
		restoreFromBackup,
		sendProgressWithFetch,
		hasUnsavedChanges: () => hasUnsavedChangesRef.current,
	};
}
