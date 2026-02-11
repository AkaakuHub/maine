"use client";

import {
	EmptyState,
	LoadingScreen,
	Navigation,
	ResponsiveVideoLayout,
	SettingsModal,
	useNavigationRefresh,
	useNetworkStatus,
	useVideoPlayer,
	type PlaylistVideo,
} from "@maine/libs";
import { WifiOff } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
	const rawReturnTo = searchParams?.get("returnTo") || null;
	const returnToPath = useMemo(() => {
		if (!rawReturnTo) {
			return null;
		}
		return rawReturnTo.startsWith("/") ? rawReturnTo : null;
	}, [rawReturnTo]);

	const handleGoBackCallback = useCallback(() => {
		triggerVideoRefresh();
		if (returnToPath) {
			router.push(returnToPath);
		} else {
			router.back();
		}
	}, [router, triggerVideoRefresh, returnToPath]);

	const handleGoHomeCallback = useCallback(() => {
		triggerVideoRefresh();
		router.push(returnToPath ?? "/");
	}, [router, triggerVideoRefresh, returnToPath]);

	const rawId = params.id;
	const id = Array.isArray(rawId) ? rawId[0] : rawId;

	const {
		videoData,
		videoInfo,
		videoSrc,
		isLoading,
		error,
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
		loadInitialProgress,
		// プレイリスト機能
		playlist,
		playlistVideos,
		playlistLoading,
	} = useVideoPlayer({
		id,
		onGoBack: handleGoBackCallback,
		onGoHome: handleGoHomeCallback,
	});

	// 動画プレイヤーのエラーハンドリング
	const [videoError, setVideoError] = useState<string | null>(null);

	const handleVideoError = useCallback((errorMessage: string) => {
		console.log("Video playback error:", errorMessage);
		setVideoError(errorMessage);
	}, []);

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

	// 進捗情報の読み込み
	const [initialTime, setInitialTime] = useState<number>(0);

	useEffect(() => {
		if (videoData && loadInitialProgress) {
			loadInitialProgress()
				.then((progressData) => {
					if (progressData?.watchTime) {
						setInitialTime(progressData.watchTime);
					}
				})
				.catch((error) => {
					console.error("Failed to load initial progress:", error);
				});
		}
	}, [videoData, loadInitialProgress]);

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

	// 動画が見つからない場合のエラー表示
	if (error === "Video not found") {
		return (
			<div className="min-h-screen bg-surface-variant">
				{/* ナビゲーションバー - 全画面で表示 */}
				<Navigation
					onGoBack={handleGoBack}
					onGoHome={handleGoHome}
					onShare={() => {}}
					onOpenSettings={() => {}}
				/>
				{/* 動画が見つからない表示 */}
				<EmptyState
					type="video-not-found"
					errorMessage={error}
					onRetry={handleGoHome}
					className="flex-1"
				/>
			</div>
		);
	}

	// 動画再生エラー表示
	if (videoError) {
		return (
			<div className="min-h-screen bg-surface-variant">
				{/* ナビゲーションバー - 全画面で表示 */}
				<Navigation
					onGoBack={handleGoBack}
					onGoHome={handleGoHome}
					onShare={() => {}}
					onOpenSettings={() => {}}
				/>
				{/* 動画再生エラー表示 */}
				<EmptyState
					type="video-not-found"
					errorMessage={videoError}
					onRetry={handleGoHome}
					className="flex-1"
				/>
			</div>
		);
	}

	// その他のエラー表示
	if (error) {
		return (
			<div className="min-h-screen bg-surface-variant">
				{/* ナビゲーションバー - 全画面で表示 */}
				<Navigation
					onGoBack={handleGoBack}
					onGoHome={handleGoHome}
					onShare={() => {}}
					onOpenSettings={() => {}}
				/>
				{/* 読み込みエラー表示 */}
				<EmptyState
					type="loading-error"
					errorMessage={error}
					onRetry={handleGoHome}
					className="flex-1"
				/>
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
				onVideoError={handleVideoError}
				playlist={playlist}
				playlistVideos={playlistVideos}
				playlistLoading={playlistLoading}
				onVideoSelect={(video: PlaylistVideo) => {
					router.push(`/play/${video.id}`);
				}}
			/>

			{/* 設定モーダル */}
			<SettingsModal
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
			/>
		</div>
	);
}
