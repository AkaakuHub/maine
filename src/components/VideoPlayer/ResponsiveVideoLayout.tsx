"use client";

import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import VideoInfo from "./VideoInfo";
import RelatedVideos from "./RelatedVideos";
import type { VideoInfoType } from "@/types/VideoInfo";

interface ResponsiveVideoLayoutProps {
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

export default function ResponsiveVideoLayout({
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
}: ResponsiveVideoLayoutProps) {
	return (
		<div className="h-[calc(100vh-64px)]">
			{/* レスポンシブなメインコンテンツ */}
			<div className="flex flex-col lg:flex-row h-full">
				{/* 動画プレイヤーセクション - モバイル: full width, デスクトップ: flex-1 */}
				<div className="w-full lg:flex-1 flex flex-col min-h-0">
					<div className="flex-1 min-h-0 lg:max-h-full">
						<ModernVideoPlayer
							src={videoSrc}
							title={videoInfo.fullTitle}
							onBack={onBack}
							onTimeUpdate={onTimeUpdate}
							initialTime={initialTime}
							className="h-full w-full"
						/>
					</div>
				</div>

				{/* コンテンツセクション - モバイル: 縦スタック, デスクトップ: サイドバー */}
				<div className="flex-1 lg:w-96 lg:flex-initial lg:border-l lg:border-purple-500/20 bg-gradient-to-b from-slate-900/80 to-slate-800/80 lg:backdrop-blur-sm overflow-y-auto lg:max-h-full">
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
						variant="responsive" // 新しいvariantを追加
					/>

					{/* 関連動画 */}
					<RelatedVideos videoInfo={videoInfo} isMobile={false} />
				</div>
			</div>
		</div>
	);
}
