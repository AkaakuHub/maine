import { useEffect, useState } from "react";

interface UpdateStatus {
	isUpdating: boolean;
	needsUpdate: boolean;
	progress: number;
	daysSince: number;
	cacheSize: number;
}

export function useVideoUpdater() {
	const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
		isUpdating: false,
		needsUpdate: false,
		progress: 0,
		daysSince: 0,
		cacheSize: 0,
	});

	useEffect(() => {
		// ページを開いた時にチェック
		checkForUpdates();
	}, []);

	const checkForUpdates = async () => {
		try {
			const response = await fetch("/api/admin/update-status");
			const status = await response.json();

			if (status.success) {
				setUpdateStatus({
					isUpdating: status.isUpdating,
					needsUpdate: status.needsUpdate,
					progress: status.progress,
					daysSince: status.daysSinceLastScan,
					cacheSize: status.totalFiles || 0,
				});

				// 更新中の場合はプログレス監視開始
				if (status.isUpdating) {
					startProgressMonitoring();
				}
			}
		} catch (error) {
			console.error("更新状況チェックエラー:", error);
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
