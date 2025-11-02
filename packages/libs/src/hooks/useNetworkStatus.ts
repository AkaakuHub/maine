"use client";

import { useEffect, useState } from "react";

export const useNetworkStatus = () => {
	const [isOnline, setIsOnline] = useState(true);
	const [isOfflineMode, setIsOfflineMode] = useState(false);

	useEffect(() => {
		// 初期状態を設定
		setIsOnline(navigator.onLine);

		const handleOnline = () => {
			setIsOnline(true);
		};

		const handleOffline = () => {
			setIsOnline(false);
		};

		// オンライン/オフライン状態の変化を監視
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// オフラインモードの手動切り替え
	const toggleOfflineMode = () => {
		setIsOfflineMode(!isOfflineMode);
	};

	// 実際のオフライン状態（ネットワーク切断 または 手動オフラインモード）
	const isOffline = !isOnline || isOfflineMode;

	return {
		isOnline,
		isOffline,
		isOfflineMode,
		toggleOfflineMode,
	};
};
