"use client";

import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import VideoInfo from "./VideoInfo";
import RelatedVideos from "./RelatedVideos";
import type { VideoInfoType } from "@/types/VideoInfo";

interface DesktopLayoutProps {
	videoSrc: string;
	videoInfo: VideoInfoType;
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

export default function DesktopLayout({
	videoSrc,
	videoInfo,
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
}: DesktopLayoutProps) {
	return (
		<div className="hidden lg:block h-[calc(100vh-64px)]">
			{/* メインコンテンツ */}
			<div className="flex h-full">
				{/* 動画プレイヤーセクション */}
				<div className="flex-1">
					{" "}
					<ModernVideoPlayer
						src={videoSrc}
						title={videoInfo.fullTitle}
						onBack={onBack}
						onTimeUpdate={onTimeUpdate}
						initialTime={initialTime}
					/>
				</div>

				{/* サイドバー */}
				<div className="w-96 border-l border-purple-500/20 bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm overflow-y-auto">
					{/* 動画情報 */}
					<VideoInfo
						videoInfo={videoInfo}
						isLiked={isLiked}
						isInWatchlist={isInWatchlist}
						showDescription={showDescription}
						onToggleLike={onToggleLike}
						onToggleWatchlist={onToggleWatchlist}
						onShare={onShare}
						onToggleDescription={onToggleDescription}
						variant="desktop"
					/>

					{/* 関連動画 */}
					<RelatedVideos videoInfo={videoInfo} isMobile={false} />
				</div>
			</div>
		</div>
	);
}
