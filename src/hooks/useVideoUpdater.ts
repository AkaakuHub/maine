import { useEffect, useState } from "react";

interface UpdateStatus {
	isUpdating: boolean;
	needsUpdate: boolean;
	progress: number;
	daysSince: number;
	cacheSize: number;
	isLoaded: boolean;
	lastScanDate: Date | null;
}

export function useVideoUpdater() {
	const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
		isUpdating: false,
		needsUpdate: false,
		progress: 0,
		daysSince: -1,
		cacheSize: 0,
		isLoaded: false,
		lastScanDate: null,
	});

	useEffect(() => {
		// ページを開いた時にチェック
		checkForUpdates();
	}, []);

	const checkForUpdates = async () => {
		try {
			console.log("useVideoUpdater: checkForUpdates called");
			const timestamp = Date.now();
			const response = await fetch(`/api/admin/update-status?t=${timestamp}`, {
				cache: "no-cache",
				headers: {
					"Cache-Control": "no-cache",
					Pragma: "no-cache",
				},
			});
			const status = await response.json();
			console.log("📋 useVideoUpdater: API response:", status);

			if (status.success) {
				setUpdateStatus({
					isUpdating: status.isUpdating,
					needsUpdate: status.needsUpdate,
					progress: status.progress,
					daysSince: status.daysSinceLastScan,
					cacheSize: status.totalFiles || 0,
					isLoaded: true,
					lastScanDate: status.lastScanDate
						? new Date(status.lastScanDate)
						: null,
				});

				// 更新中の場合はプログレス監視開始
				if (status.isUpdating) {
					startProgressMonitoring();
				}
			}
		} catch (error) {
			console.error("更新状況チェックエラー:", error);
			// エラー時でもisLoadedをtrueにして、デフォルト値で表示を許可
			setUpdateStatus((prev) => ({
				...prev,
				isLoaded: true,
			}));
		}
	};

	const startProgressMonitoring = () => {
		const interval = setInterval(async () => {
			try {
				const response = await fetch("/api/admin/update-progress");
				const progressData = await response.json();

				if (progressData.success) {
					setUpdateStatus((prev) => ({
						...prev,
						progress: progressData.progress,
						isUpdating: progressData.isUpdating,
					}));

					if (progressData.completed) {
						clearInterval(interval);
						setUpdateStatus((prev) => ({
							...prev,
							isUpdating: false,
							progress: 100,
						}));

						// 完了後、検索結果を自動リフレッシュ
						window.dispatchEvent(new CustomEvent("videoListUpdated"));
					}
				}
			} catch (error) {
				console.error("プログレス監視エラー:", error);
				clearInterval(interval);
			}
		}, 1000);

		// 5分でタイムアウト
		setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
	};

	return updateStatus;
}
