"use client";

import Navigation from "@/components/VideoPlayer/Navigation";
import LoadingScreen from "@/components/VideoPlayer/LoadingScreen";
import MobileLayout from "@/components/VideoPlayer/MobileLayout";
import DesktopLayout from "@/components/VideoPlayer/DesktopLayout";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";

export default function PlayPage() {
	const {
		animeData,
		animeInfo,
		videoSrc,
		isLoading,
		showDescription,
		isLiked,
		isInWatchlist,
		handleGoBack,
		handleGoHome,
		handleShare,
		toggleLike,
		toggleWatchlist,
		toggleDescription,
		handleTimeUpdate,
	} = useVideoPlayer();

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
			/>			{/* モバイル・縦画面レイアウト */}
			<MobileLayout
				videoSrc={videoSrc}
				animeInfo={animeInfo}
				onBack={handleGoBack}
				isLiked={isLiked}
				isInWatchlist={isInWatchlist}
				showDescription={showDescription}
				onToggleLike={toggleLike}
				onToggleWatchlist={toggleWatchlist}
				onShare={handleShare}
				onToggleDescription={toggleDescription}
				onTimeUpdate={handleTimeUpdate}
				initialTime={animeData?.watchTime || 0}
			/>			{/* デスクトップレイアウト */}
			<DesktopLayout
				videoSrc={videoSrc}
				animeInfo={animeInfo}
				onBack={handleGoBack}
				isLiked={isLiked}
				isInWatchlist={isInWatchlist}
				showDescription={showDescription}
				onToggleLike={toggleLike}
				onToggleWatchlist={toggleWatchlist}
				onShare={handleShare}
				onToggleDescription={toggleDescription}
				onTimeUpdate={handleTimeUpdate}
				initialTime={animeData?.watchTime || 0}
			/>
		</div>
	);
}
