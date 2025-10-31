"use client";

import { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";

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
			setIsInstallable(false);
		}

		setDeferredPrompt(null);
	};

	if (isInstalled) {
		return (
			<div
				className={`flex items-center gap-2 text-sm text-success ${className}`}
			>
				<Check className="w-4 h-4" />
				PWAとしてインストール済み
			</div>
		);
	}

	if (!isInstallable) {
		return null;
	}

	return (
		<button
			type="button"
			onClick={handleInstallClick}
			className={`flex items-center gap-2 px-3 py-2 text-sm bg-primary text-text-inverse rounded-lg hover:bg-primary-hover transition-all duration-200 ${className}`}
			title="ホーム画面に追加してオフラインでも利用可能"
		>
			<Download className="h-4 w-4" />
			<span className="hidden md:inline">アプリをインストール</span>
			<span className="md:hidden">インストール</span>
		</button>
	);
}
