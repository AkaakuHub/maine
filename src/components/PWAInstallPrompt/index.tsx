"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
}

interface PWAInstallPromptProps {
	className?: string;
}

export default function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
	const [isInstallable, setIsInstallable] = useState(false);
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [isInstalled, setIsInstalled] = useState(false);

	useEffect(() => {
		// Service Workerの登録状態を確認
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.ready.then(() => {
				console.log("Service Worker is ready");
			});
		}

		// PWAインストール可能か確認
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
			setIsInstallable(true);
		};

		// PWAがすでにインストール済みか確認
		const checkIfInstalled = () => {
			if (window.matchMedia("(display-mode: standalone)").matches) {
				setIsInstalled(true);
			}
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		checkIfInstalled();

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
		};
	}, []);

	const handleInstallClick = async () => {
		if (!deferredPrompt) return;

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === "accepted") {
			console.log("PWA installed");
			setIsInstallable(false);
		}

		setDeferredPrompt(null);
	};

	if (isInstalled) {
		return (
			<div className={`text-sm text-green-600 ${className}`}>
				✓ PWAとしてインストール済み
			</div>
		);
	}

	if (!isInstallable) {
		return null;
	}

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<button
				type="button"
				onClick={handleInstallClick}
				className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
			>
				アプリをインストール
			</button>
			<span className="text-xs text-gray-500">
				ホーム画面に追加してオフラインでも利用可能
			</span>
		</div>
	);
}
