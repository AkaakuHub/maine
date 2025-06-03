"use client";

import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import VideoInfo from "./VideoInfo";
import RelatedVideos from "./RelatedVideos";
import type { AnimeInfo } from "@/types/AnimeInfo";

interface MobileLayoutProps {
	videoSrc: string;
	animeInfo: AnimeInfo;
	onBack: () => void;
	isLiked: boolean;
	isInWatchlist: boolean;
	showDescription: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onToggleDescription: () => void;
	onTimeUpdate?: (currentTime: number, duration: number) => void;
	initialTime?: number;
}

export default function MobileLayout({
	videoSrc,
	animeInfo,
	onBack,
	isLiked,
	isInWatchlist,
	showDescription,
	onToggleLike,
	onToggleWatchlist,
	onShare,
	onToggleDescription,
	onTimeUpdate,
	initialTime,
}: MobileLayoutProps) {
	return (
		<div className="lg:hidden">
			{/* 動画プレイヤー */}
			<div className="w-full">
				{" "}
				<ModernVideoPlayer
					src={videoSrc}
					title={animeInfo.fullTitle}
					onBack={onBack}
					onTimeUpdate={onTimeUpdate}
					initialTime={initialTime}
				/>
			</div>

			{/* モバイル用コンテンツエリア */}
			<div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
				{/* 動画情報セクション */}
				<VideoInfo
					animeInfo={animeInfo}
					isLiked={isLiked}
					isInWatchlist={isInWatchlist}
					showDescription={showDescription}
					onToggleLike={onToggleLike}
					onToggleWatchlist={onToggleWatchlist}
					onShare={onShare}
					onToggleDescription={onToggleDescription}
				/>

				{/* 関連動画セクション */}
				<RelatedVideos animeInfo={animeInfo} isMobile={true} />
			</div>
		</div>
	);
}
