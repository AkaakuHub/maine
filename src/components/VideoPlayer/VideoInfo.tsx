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
						? "text-2xl font-bold text-text mb-2 leading-tight"
						: isResponsive
							? "text-xl lg:text-2xl font-bold text-text mb-2 leading-tight"
							: "text-xl font-bold text-text mb-2 leading-tight"
				}
			>
				{videoInfo.title}
			</h1>

			{videoInfo.episode && (
				<p
					className={
						isDesktop
							? "text-primary text-base mb-3 font-medium"
							: isResponsive
								? "text-primary lg:text-base mb-3 font-medium"
								: "text-primary mb-3 font-medium"
					}
				>
					{videoInfo.episode}
				</p>
			)}

			{/* 放送日時情報 */}
			{videoInfo.broadcastDate && (
				<div
					className={`mb-3 ${
						isDesktop
							? "text-base"
							: isResponsive
								? "text-sm lg:text-base"
								: "text-sm"
					}`}
				>
					<p className="text-text-secondary">
						放送日時: {videoInfo.broadcastDate.getFullYear()}/
						{(videoInfo.broadcastDate.getMonth() + 1)
							.toString()
							.padStart(2, "0")}
						/{videoInfo.broadcastDate.getDate().toString().padStart(2, "0")}(
						{videoInfo.dayOfWeek}) {videoInfo.timeSlot}
					</p>
				</div>
			)}

			<div
				className={`flex flex-wrap items-center gap-3 text-sm text-text-secondary mb-4 ${
					isDesktop ? "gap-4" : isResponsive ? "gap-3 lg:gap-4" : "gap-3"
				}`}
			>
				{videoInfo.genre && (
					<span
						className={`bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-text font-medium ${
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
				{videoInfo.broadcastStation && (
					<span
						className={`bg-gradient-to-r from-green-600 to-teal-600 rounded-full text-text font-medium ${
							isDesktop
								? "px-3 py-1"
								: isResponsive
									? "px-2 py-1 lg:px-3"
									: "px-2 py-1"
						}`}
					>
						{videoInfo.broadcastStation}
					</span>
				)}
				{videoInfo.weeklySchedule && (
					<span
						className={`bg-gradient-to-r from-orange-600 to-red-600 rounded-full text-text font-medium ${
							isDesktop
								? "px-3 py-1"
								: isResponsive
									? "px-2 py-1 lg:px-3"
									: "px-2 py-1"
						}`}
					>
						{videoInfo.weeklySchedule}
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
				filePath={videoInfo.filePath}
				title={videoInfo.title}
			/>
		</div>
	);
}
