"use client";

import ActionButtons from "./ActionButtons";
import VideoDescription from "./VideoDescription";
import type { VideoInfoType } from "@/types/VideoInfo";

interface VideoInfoProps {
	videoInfo: VideoInfoType;
	isLiked: boolean;
	isInWatchlist: boolean;
	showDescription: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onToggleDescription: () => void;
	onDownload?: () => void;
	variant?: "mobile" | "desktop" | "responsive";
}

export default function VideoInfo({
	videoInfo,
	isLiked,
	isInWatchlist,
	showDescription,
	onToggleLike,
	onToggleWatchlist,
	onShare,
	onToggleDescription,
	onDownload,
	variant = "mobile",
}: VideoInfoProps) {
	const isDesktop = variant === "desktop";
	const isResponsive = variant === "responsive";

	return (
		<div
			className={
				isDesktop
					? "p-6 border-b border-purple-500/20"
					: isResponsive
						? "p-4 lg:p-6 border-b border-purple-500/20"
						: "p-4 border-b border-purple-500/20"
			}
		>
			<h1
				className={
					isDesktop
						? "text-2xl font-bold text-white mb-2 leading-tight"
						: isResponsive
							? "text-xl lg:text-2xl font-bold text-white mb-2 leading-tight"
							: "text-xl font-bold text-white mb-2 leading-tight"
				}
			>
				{videoInfo.title}
			</h1>

			{videoInfo.episode && (
				<p
					className={
						isDesktop
							? "text-purple-300 text-base mb-3 font-medium"
							: isResponsive
								? "text-purple-300 lg:text-base mb-3 font-medium"
								: "text-purple-300 mb-3 font-medium"
					}
				>
					{videoInfo.episode}
				</p>
			)}

			<div
				className={`flex flex-wrap items-center gap-3 text-sm text-slate-300 mb-4 ${
					isDesktop ? "gap-4" : isResponsive ? "gap-3 lg:gap-4" : "gap-3"
				}`}
			>
				{videoInfo.genre && (
					<span
						className={`bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium ${
							isDesktop
								? "px-3 py-1"
								: isResponsive
									? "px-2 py-1 lg:px-3"
									: "px-2 py-1"
						}`}
					>
						{videoInfo.genre}
					</span>
				)}
				{videoInfo.year && <span>{videoInfo.year}</span>}
				{videoInfo.year && videoInfo.duration && <span>•</span>}
				{videoInfo.duration && <span>{videoInfo.duration}</span>}
			</div>

			{/* アクションボタン */}
			<ActionButtons
				isLiked={isLiked}
				isInWatchlist={isInWatchlist}
				onToggleLike={onToggleLike}
				onToggleWatchlist={onToggleWatchlist}
				onShare={onShare}
				onDownload={onDownload}
			/>

			{/* 概要 */}
			<VideoDescription
				description={videoInfo.description}
				showDescription={showDescription}
				onToggleDescription={onToggleDescription}
			/>
		</div>
	);
}
