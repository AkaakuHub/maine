"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, AlertTriangle } from "lucide-react";
import Navigation from "@/components/VideoPlayer/Navigation";
import LoadingScreen from "@/components/VideoPlayer/LoadingScreen";
import ResponsiveVideoLayout from "@/components/VideoPlayer/ResponsiveVideoLayout";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function PlayPage() {
	const router = useRouter();
	const { isOnline, isOfflineMode } = useNetworkStatus();
	const [showNetworkWarning, setShowNetworkWarning] = useState(false);
	const [isPageReady, setIsPageReady] = useState(false);

	const {
		videoData,
		videoInfo,
		videoSrc,
		isLoading,
		showDescription,
		isLiked,
		isInWatchlist,
		handleGoBack,
		handleGoHome,
		handleShare,
		handleDownload,
		toggleLike,
		toggleWatchlist,
		toggleDescription,
		handleTimeUpdate,
	} = useVideoPlayer();

	// ページの準備状態を管理
	useEffect(() => {
		// ページのコンポーネントが読み込まれたことを示す
		setIsPageReady(true);
	}, []);

	// ネットワーク状態の監視
	useEffect(() => {
		// オフライン時の処理
		if (!isOnline && isPageReady) {
			console.log("オフライン動画再生モード");
			// オフライン時はストリーミング警告ではなく、IndexedDBから動画を取得
			if (!videoSrc && !isLoading) {
				console.log("オフライン動画の読み込みを試行中...");
				setShowNetworkWarning(true);
			} else if (videoSrc) {
				// オフライン動画が正常に読み込まれた場合
				setShowNetworkWarning(false);
			}
		} else if (isOnline) {
			// オンライン時は警告を非表示
			setShowNetworkWarning(false);
		}
	}, [isOnline, videoSrc, isPageReady, isLoading]);

	// 進捗情報のデバッグログ
	const initialTime = videoData?.watchTime || 0;

	// オフライン時のフォールバック表示
	if (!isPageReady) {
		return <LoadingScreen />;
	}

	// ネットワーク警告の表示
	if (showNetworkWarning) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
				<div className="max-w-md mx-auto p-8 text-center">
					<WifiOff className="h-16 w-16 mx-auto text-red-400 mb-4" />
					<h2 className="text-2xl font-bold text-white mb-4">オフラインです</h2>
					<p className="text-slate-400 mb-6">
						この動画はオフラインで利用できません。インターネット接続を確認するか、ダウンロード済みの動画から選択してください。
					</p>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => router.push("/")}
							className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							ホームに戻る
						</button>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
						>
							再試行
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (isLoading || !videoSrc) {
		return <LoadingScreen />;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20">
			{/* ナビゲーションバー - 全画面で表示 */}
			<Navigation
				onGoBack={handleGoBack}
				onGoHome={handleGoHome}
				onShare={handleShare}
			/>

			{/* レスポンシブレイアウト */}
			<ResponsiveVideoLayout
				videoSrc={videoSrc}
				videoInfo={videoInfo}
				onBack={handleGoBack}
				isLiked={isLiked}
				isInWatchlist={isInWatchlist}
				showDescription={showDescription}
				onToggleLike={toggleLike}
				onToggleWatchlist={toggleWatchlist}
				onShare={handleShare}
				onDownload={handleDownload}
				onToggleDescription={toggleDescription}
				onTimeUpdate={handleTimeUpdate}
				initialTime={initialTime}
			/>
		</div>
	);
}
