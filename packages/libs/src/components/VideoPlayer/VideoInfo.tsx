"use client";

import type { VideoInfoType } from "../../types/VideoInfo";
import ActionButtons from "./ActionButtons";
import VideoDescription from "./VideoDescription";

interface VideoInfoProps {
	videoInfo: VideoInfoType;
	isLiked: boolean;
	isInWatchlist: boolean;
	showDescription: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onToggleDescription: () => void;
	onDownload: () => void;
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
					? "p-6 border-b border-border"
					: isResponsive
						? "p-4 lg:p-6  border-border"
						: "p-4 border-border"
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
						className={`bg-primary rounded-full text-text-inverse font-medium ${
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
						className={`bg-success rounded-full text-text-inverse font-medium ${
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
						className={`bg-warning rounded-full text-text-inverse font-medium ${
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
				video={videoInfo}
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
