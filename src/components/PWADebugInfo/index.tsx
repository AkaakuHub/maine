"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface PWADebugInfoProps {
	className?: string;
}

export default function PWADebugInfo({ className }: PWADebugInfoProps) {
	const [serviceWorkerStatus, setServiceWorkerStatus] =
		useState<string>("未対応");
	const [cacheStatus, setCacheStatus] = useState<string>("確認中...");
	const [storageQuota, setStorageQuota] = useState<string>("不明");
	const { isOnline, isOfflineMode } = useNetworkStatus();

	useEffect(() => {
		// Service Worker状態をチェック
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.ready
				.then(() => {
					setServiceWorkerStatus("有効");
				})
				.catch(() => {
					setServiceWorkerStatus("エラー");
				});

			// Service Worker登録状態を詳細チェック
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				console.log(
					"PWA Debug: Service Worker registrations:",
					registrations.length,
				);
				registrations.forEach((registration, index) => {
					console.log(`PWA Debug: SW ${index + 1}:`, {
						scope: registration.scope,
						active: registration.active?.state,
						installing: registration.installing?.state,
						waiting: registration.waiting?.state,
					});
				});
			});
		}

		// Cache API状態をチェック
		if ("caches" in window) {
			caches.keys().then((cacheNames) => {
				setCacheStatus(`${cacheNames.length} キャッシュ`);
				console.log("PWA Debug: Available caches:", cacheNames);

				// 各キャッシュの内容を確認
				Promise.all(
					cacheNames.map(async (cacheName) => {
						const cache = await caches.open(cacheName);
						const keys = await cache.keys();
						console.log(
							`PWA Debug: Cache "${cacheName}" contains:`,
							keys.map((req) => req.url),
						);
					}),
				);
			});
		} else {
			setCacheStatus("非対応");
		}

		// ストレージクォータをチェック
		if ("storage" in navigator && "estimate" in navigator.storage) {
			navigator.storage.estimate().then((estimate) => {
				const used = estimate.usage || 0;
				const quota = estimate.quota || 0;
				const usedMB = Math.round((used / 1024 / 1024) * 100) / 100;
				const quotaMB = Math.round(quota / 1024 / 1024);
				setStorageQuota(`${usedMB}MB / ${quotaMB}MB`);
				console.log("PWA Debug: Storage estimate:", {
					used,
					quota,
					usedMB,
					quotaMB,
				});
			});
		}

		// PWA関連のイベントリスナーを設定
		const handleOnline = () => console.log("PWA Debug: オンラインになりました");
		const handleOffline = () =>
			console.log("PWA Debug: オフラインになりました");

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	return (
		<div
			className={`bg-surface/50 backdrop-blur-sm rounded-lg p-4 border border-border-muted ${className}`}
		>
			<h3 className="text-lg font-semibold mb-3 text-text">PWA デバッグ情報</h3>
			<div className="space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-text-secondary">ネットワーク状態:</span>
					<span className={isOnline ? "text-success" : "text-error"}>
						{isOnline ? "オンライン" : "オフライン"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-secondary">オフラインモード:</span>
					<span className={isOfflineMode ? "text-warning" : "text-success"}>
						{isOfflineMode ? "有効" : "無効"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-secondary">Service Worker:</span>
					<span
						className={
							serviceWorkerStatus === "有効" ? "text-success" : "text-error"
						}
					>
						{serviceWorkerStatus}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-secondary">Cache API:</span>
					<span className="text-text">{cacheStatus}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-secondary">ストレージ使用量:</span>
					<span className="text-text">{storageQuota}</span>
				</div>
			</div>
			<div className="mt-3 pt-3 border-t border-border">
				<p className="text-xs text-text-muted">
					デバッグ情報:
					ブラウザのDevToolsのConsoleタブでより詳細な情報を確認できます
				</p>
			</div>
		</div>
	);
}
