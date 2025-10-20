"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, Home, RefreshCw } from "lucide-react";

export default function OfflinePage() {
	const [isOnline, setIsOnline] = useState(false);
	const router = useRouter();

	useEffect(() => {
		const updateOnlineStatus = () => {
			setIsOnline(navigator.onLine);
		};

		setIsOnline(navigator.onLine);
		window.addEventListener("online", updateOnlineStatus);
		window.addEventListener("offline", updateOnlineStatus);

		return () => {
			window.removeEventListener("online", updateOnlineStatus);
			window.removeEventListener("offline", updateOnlineStatus);
		};
	}, []);

	const handleRetry = () => {
		if (navigator.onLine) {
			router.back();
		} else {
			window.location.reload();
		}
	};

	const handleGoHome = () => {
		router.push("/");
	};

	return (
		<div className="min-h-screen bg-gradient-to-br bg-surface-variant flex items-center justify-center">
			<div className="max-w-md mx-auto p-8 text-center">
				<div className="mb-8">
					<WifiOff className="h-24 w-24 mx-auto text-error mb-4" />
					<h1 className="text-3xl font-bold text-text mb-4">オフラインです</h1>
					<p className="text-text-secondary mb-6">
						インターネット接続を確認してください。オフライン動画がある場合は、ホームページから視聴できます。
					</p>
				</div>

				<div className="space-y-4">
					<div
						className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
							isOnline
								? "bg-success/20 border border-success"
								: "bg-error/20 border border-error"
						}`}
					>
						<div
							className={`w-3 h-3 rounded-full ${isOnline ? "bg-success" : "bg-error"}`}
						/>
						<span className="text-text">
							{isOnline ? "オンライン" : "オフライン"}
						</span>
					</div>

					<div className="flex gap-3">
						<button
							type="button"
							onClick={handleRetry}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-text rounded-lg hover:bg-primary-hover transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							再試行
						</button>
						<button
							type="button"
							onClick={handleGoHome}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-elevated text-text rounded-lg hover:bg-surface-elevated transition-colors"
						>
							<Home className="h-4 w-4" />
							ホーム
						</button>
					</div>
				</div>

				<div className="mt-8 p-4 bg-surface/50 rounded-lg border border-border-muted">
					<h3 className="text-lg font-semibold text-text mb-2">
						オフライン機能
					</h3>
					<p className="text-sm text-text-secondary">
						ダウンロード済みの動画は、オフラインでも視聴できます。ホームページの「オフライン」タブからアクセスしてください。
					</p>
				</div>
			</div>
		</div>
	);
}
