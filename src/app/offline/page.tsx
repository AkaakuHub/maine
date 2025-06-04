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
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
			<div className="max-w-md mx-auto p-8 text-center">
				<div className="mb-8">
					<WifiOff className="h-24 w-24 mx-auto text-red-400 mb-4" />
					<h1 className="text-3xl font-bold text-white mb-4">オフラインです</h1>
					<p className="text-slate-400 mb-6">
						インターネット接続を確認してください。オフライン動画がある場合は、ホームページから視聴できます。
					</p>
				</div>

				<div className="space-y-4">
					<div
						className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
							isOnline
								? "bg-green-500/20 border border-green-500"
								: "bg-red-500/20 border border-red-500"
						}`}
					>
						<div
							className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`}
						/>
						<span className="text-white">
							{isOnline ? "オンライン" : "オフライン"}
						</span>
					</div>

					<div className="flex gap-3">
						<button
							type="button"
							onClick={handleRetry}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							再試行
						</button>
						<button
							type="button"
							onClick={handleGoHome}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
						>
							<Home className="h-4 w-4" />
							ホーム
						</button>
					</div>
				</div>

				<div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
					<h3 className="text-lg font-semibold text-white mb-2">
						オフライン機能
					</h3>
					<p className="text-sm text-slate-400">
						ダウンロード済みの動画は、オフラインでも視聴できます。ホームページの「オフライン」タブからアクセスしてください。
					</p>
				</div>
			</div>
		</div>
	);
}
