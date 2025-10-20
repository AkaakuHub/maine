"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { WifiOff } from "lucide-react";
import {
	Navigation,
	LoadingScreen,
	useNetworkStatus,
	useVideoPlayer,
	ResponsiveVideoLayout,
	SettingsModal,
	useNavigationRefresh,
} from "@maine/libs";

export default function PlayPage() {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const { isOnline } = useNetworkStatus();
	const { triggerVideoRefresh } = useNavigationRefresh();
	const [showNetworkWarning, setShowNetworkWarning] = useState(false);
	const [isPageReady, setIsPageReady] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	// ナビゲーション用のコールバック
	const handleGoBackCallback = useCallback(() => {
		triggerVideoRefresh();
		router.back();
	}, [router, triggerVideoRefresh]);

	const handleGoHomeCallback = useCallback(() => {
		triggerVideoRefresh();
		router.push("/");
	}, [router, triggerVideoRefresh]);

	// URLからvideoIdを取得
	const rawVideoId = params.videoId;
	const videoId = Array.isArray(rawVideoId) ? rawVideoId[0] : rawVideoId;

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
	} = useVideoPlayer({
		videoId,
		explicitOfflineMode: searchParams?.get("offline") === "true",
		onGoBack: handleGoBackCallback,
		onGoHome: handleGoHomeCallback,
	});

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
			<div className="min-h-screen bg-surface-variant flex items-center justify-center">
				<div className="max-w-md mx-auto p-8 text-center">
					<WifiOff className="h-16 w-16 mx-auto text-error mb-4" />
					<h2 className="text-2xl font-bold text-text mb-4">オフラインです</h2>
					<p className="text-text-secondary mb-6">
						この動画はオフラインで利用できません。インターネット接続を確認するか、ダウンロード済みの動画から選択してください。
					</p>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => router.push("/")}
							className="flex-1 px-4 py-2 bg-primary text-text rounded-lg hover:bg-primary-hover transition-colors"
						>
							ホームに戻る
						</button>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="flex-1 px-4 py-2 bg-surface-elevated text-text rounded-lg hover:bg-surface-elevated transition-colors"
						>
							再試行
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (isLoading || !videoSrc || !videoData) {
		return <LoadingScreen />;
	}

	return (
		<div className="min-h-screen bg-surface-variant">
			{/* ナビゲーションバー - 全画面で表示 */}
			<Navigation
				onGoBack={handleGoBack}
				onGoHome={handleGoHome}
				onShare={handleShare}
				onOpenSettings={() => setShowSettings(true)}
			/>

			{/* レスポンシブレイアウト */}
			<ResponsiveVideoLayout
				videoSrc={videoSrc}
				videoInfo={videoInfo}
				videoData={videoData}
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

			{/* 設定モーダル */}
			<SettingsModal
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
			/>
		</div>
	);
}
