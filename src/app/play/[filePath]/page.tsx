"use client";

import Navigation from "@/components/VideoPlayer/Navigation";
import LoadingScreen from "@/components/VideoPlayer/LoadingScreen";
import ResponsiveVideoLayout from "@/components/VideoPlayer/ResponsiveVideoLayout";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";

export default function PlayPage() {
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
				initialTime={videoData?.watchTime || 0}
			/>
		</div>
	);
}
