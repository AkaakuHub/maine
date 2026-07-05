"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useEffect, useState } from "react";
import HelpModal from "../../components/HelpModal";
import ModernVideoPlayer from "../../components/ModernVideoPlayer";
import { cn } from "../../libs/utils";
import type { VideoFileData } from "../../type";
import type { VideoInfoType } from "../../types/VideoInfo";
import type { PlaylistData, PlaylistVideo } from "../../types/Playlist";
import { PlaylistVideoList } from "../PlaylistVideoList";
import RelatedVideos from "./RelatedVideos";
import VideoInfo from "./VideoInfo";

interface ResponsiveVideoLayoutProps {
	videoSrc: string;
	videoInfo: VideoInfoType;
	videoData: VideoFileData;
	onBack: () => void;
	onHome: () => void;
	onOpenSettings: () => void;
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
	onHome,
	onOpenSettings,
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
	const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

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
		<div className="relative h-screen">
			{!isDesktopSidebarOpen ? (
				<button
					type="button"
					onClick={() => setIsDesktopSidebarOpen(true)}
					className="hidden lg:inline-flex absolute right-4 top-16 z-40 h-10 w-10 items-center justify-center rounded-full bg-overlay/55 text-text-inverse backdrop-blur transition-colors hover:bg-primary/80"
					aria-label="サイドバーを開く"
					title="サイドバーを開く"
				>
					<PanelRightOpen className="h-5 w-5" />
				</button>
			) : null}

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
							onHome={onHome}
							onShare={onShare}
							onOpenAppSettings={onOpenSettings}
							onTimeUpdate={onTimeUpdate}
							initialTime={initialTime}
							onShowHelp={() => setShowHelpModal(true)}
							onError={onVideoError}
							className="h-full not-lg:max-h-[50vh] w-full"
							playlistVideos={playlistVideos || []}
							onVideoSelect={onVideoSelect}
							onVideoEnd={() => {
								// 動画終了時の追加処理があればここに記述
							}}
							id={videoData?.id}
						/>
					</div>
				</div>

				{/* コンテンツセクション - モバイル: 縦スタック, デスクトップ: サイドバー */}
				<div
					className={cn(
						"flex-1 bg-surface-variant overflow-y-auto",
						isDesktopSidebarOpen
							? "lg:w-96 lg:flex-initial lg:border-l lg:border-border lg:backdrop-blur-sm lg:max-h-full"
							: "lg:hidden",
					)}
				>
					<div className="hidden lg:flex justify-end p-3 pb-0">
						<button
							type="button"
							onClick={() => setIsDesktopSidebarOpen(false)}
							className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
							aria-label="サイドバーを閉じる"
							title="サイドバーを閉じる"
						>
							<PanelRightClose className="h-5 w-5" />
						</button>
					</div>
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
								currentId={videoData?.id}
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
