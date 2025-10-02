"use client";

import { useState, useEffect } from "react";
import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import VideoInfo from "./VideoInfo";
import RelatedVideos from "./RelatedVideos";
import HelpModal from "@/components/HelpModal";
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
	onDownload?: () => void;
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
	onDownload,
	onTimeUpdate,
	initialTime,
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
							onShowHelp={() => setShowHelpModal(true)}
							className="h-full w-full"
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
