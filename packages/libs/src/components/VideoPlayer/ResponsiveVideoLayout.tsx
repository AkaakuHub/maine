"use client";

import { useEffect, useState } from "react";
import HelpModal from "../../components/HelpModal";
import ModernVideoPlayer from "../../components/ModernVideoPlayer";
import type { VideoFileData } from "../../type";
import type { VideoInfoType } from "../../types/VideoInfo";
import type { PlaylistData, PlaylistVideo } from "../../types/Playlist";
import RelatedVideos from "./RelatedVideos";
import VideoInfo from "./VideoInfo";
import { PlaylistVideoList } from "../PlaylistVideoList";

interface ResponsiveVideoLayoutProps {
	videoSrc: string;
	videoInfo: VideoInfoType;
	videoData: VideoFileData;
	onBack: () => void;
	isLiked: boolean;
	isInWatchlist: boolean;
	showDescription: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onToggleDescription: () => void;
	onDownload: () => void;
	onTimeUpdate?: (currentTime: number, duration: number) => void;
	initialTime?: number;
	onVideoError?: (error: string) => void;
	// プレイリスト機能
	playlist?: PlaylistData | null;
	playlistVideos?: PlaylistVideo[];
	playlistLoading?: boolean;
	onVideoSelect?: (video: PlaylistVideo) => void;
}

export function ResponsiveVideoLayout({
	videoSrc,
	videoInfo,
	videoData,
	onBack,
	isLiked,
	isInWatchlist,
	showDescription,
	onToggleLike,
	onToggleWatchlist,
	onShare,
	onToggleDescription,
	onDownload,
	onTimeUpdate,
	initialTime,
	onVideoError,
	playlist,
	playlistVideos,
	onVideoSelect,
}: ResponsiveVideoLayoutProps) {
	const [showHelpModal, setShowHelpModal] = useState(false);

	// Escキーでヘルプモーダルを閉じる
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.code === "Escape" && showHelpModal) {
				e.preventDefault();
				setShowHelpModal(false);
			}
		};

		if (showHelpModal) {
			document.addEventListener("keydown", handleKeyPress);
		}

		return () => {
			document.removeEventListener("keydown", handleKeyPress);
		};
	}, [showHelpModal]);
	return (
		<div className="h-[calc(100vh-64px)]">
			{/* レスポンシブなメインコンテンツ */}
			<div className="flex flex-col lg:flex-row lg:h-full min-h-0 overflow-y-scroll lg:overflow-y-auto hidden-scrollbar">
				{/* 動画プレイヤーセクション - モバイル: full width, デスクトップ: flex-1 */}
				<div className="w-full lg:flex-1 flex flex-col min-h-0">
					<div className="flex-1 min-h-0 lg:max-h-full">
						<ModernVideoPlayer
							src={videoSrc}
							title={videoInfo.fullTitle}
							thumbnailPath={videoData?.thumbnailPath}
							onBack={onBack}
							onTimeUpdate={onTimeUpdate}
							initialTime={initialTime}
							onShowHelp={() => setShowHelpModal(true)}
							onError={onVideoError}
							className="h-full not-lg:max-h-[50vh] w-full"
						/>
					</div>
				</div>

				{/* コンテンツセクション - モバイル: 縦スタック, デスクトップ: サイドバー */}
				<div className="flex-1 lg:w-96 lg:flex-initial lg:border-l lg:border-border bg-surface-variant lg:backdrop-blur-sm overflow-y-auto lg:max-h-full">
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
						onDownload={onDownload}
						variant="responsive" // 新しいvariantを追加
					/>

					{/* プレイリスト */}
					{playlist && (
						<div className="p-4 border-t border-border">
							<PlaylistVideoList
								videos={playlistVideos || []}
								currentVideoId={videoData?.videoId}
								onVideoSelect={onVideoSelect}
								className="mt-2"
							/>
						</div>
					)}

					{/* 関連動画 */}
					<RelatedVideos videoInfo={videoInfo} isMobile={false} />
				</div>
			</div>

			{/* ヘルプモーダル */}
			<HelpModal
				isOpen={showHelpModal}
				onClose={() => setShowHelpModal(false)}
			/>
		</div>
	);
}
