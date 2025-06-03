"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Clock, Calendar, HardDrive, Info, Heart } from "lucide-react";
import type { VideoData } from "@/type";
import { cn, formatFileSize, truncateText } from "@/libs/utils";
import { useProgress } from "@/hooks/useProgress";

interface VideoCardProps {
	video: VideoData;
	priority?: boolean;
	className?: string;
	onLikeUpdate?: (id: string, isLiked: boolean) => void;
}

const VideoCard = ({
	video,
	priority = false,
	className,
	onLikeUpdate,
}: VideoCardProps) => {
	const [imageError, setImageError] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [isLiked, setIsLiked] = useState(video.isLiked);
	const { updateProgress, loading: progressLoading } = useProgress();

	// ライクボタンの処理
	const handleLikeToggle = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const newLikeStatus = !isLiked;
		setIsLiked(newLikeStatus); // 楽観的更新

		try {
			await updateProgress({
				id: video.id,
				isLiked: newLikeStatus,
			});
			onLikeUpdate?.(video.id, newLikeStatus);
		} catch (error) {
			// エラー時は元に戻す
			setIsLiked(isLiked);
			console.error("Failed to update like status:", error);
		}
	};

	// 視聴進捗の計算
	const watchProgressPercentage = video.watchProgress || 0;

	return (
		<div
			className={cn(
				"group relative bg-slate-800/40 rounded-xl overflow-hidden transition-all duration-300 ease-out",
				"hover:scale-105 hover:z-10 hover:shadow-2xl hover:shadow-purple-500/20",
				"border border-slate-700/50 hover:border-purple-400/50",
				className,
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Link
				href={`/play/${encodeURIComponent(video.filePath)}`}
				className="block"
			>
				{/* サムネイル */}
				<div className="relative aspect-video bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
					{video.thumbnail && !imageError ? (
						<Image
							src={video.thumbnail}
							alt={video.title}
							fill
							priority={priority}
							className="object-cover transition-transform duration-300 group-hover:scale-110"
							onError={() => setImageError(true)}
							unoptimized
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<Play className="h-12 w-12 text-slate-400 transition-colors group-hover:text-white" />
						</div>
					)}
					{/* ホバー時のオーバーレイ */}
					<div
						className={cn(
							"absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
							"opacity-0 transition-opacity duration-300",
							"group-hover:opacity-100",
						)}
					>
						<div className="absolute bottom-4 left-4 right-4">
							<div className="flex items-center gap-2 mb-2">
								<div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
									<Play className="h-4 w-4 text-white" />
								</div>
								<span className="text-white text-sm font-medium">再生</span>
							</div>
						</div>
					</div>{" "}
					{/* エピソード番号 */}
					{video.episode && (
						<div className="absolute top-3 left-3">
							<div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
								<span className="text-white text-xs font-medium">
									EP. {video.episode}
								</span>
							</div>
						</div>
					)}
					{/* ライクボタン */}
					<div className="absolute top-3 right-3 flex gap-2">
						{video.year && (
							<div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
								<span className="text-white text-xs font-medium">
									{video.year}
								</span>
							</div>
						)}
						<button
							type="button"
							onClick={handleLikeToggle}
							disabled={progressLoading}
							className={cn(
								"bg-black/70 backdrop-blur-sm p-1.5 rounded-md transition-all duration-200",
								"hover:bg-black/90 disabled:opacity-50",
								isLiked ? "text-red-400" : "text-white/70",
							)}
						>
							<Heart
								className={cn(
									"h-4 w-4 transition-all duration-200",
									isLiked && "fill-current",
								)}
							/>
						</button>
					</div>
				</div>

				{/* コンテンツ */}
				<div className="p-4">
					<h3 className="font-semibold text-white mb-2 line-clamp-2 leading-tight">
						{truncateText(video.title, 60)}
					</h3>

					{/* メタデータ */}
					<div className="space-y-2">
						<div className="flex items-center gap-4 text-xs text-slate-400">
							{video.year && (
								<div className="flex items-center gap-1">
									<Calendar className="h-3 w-3" />
									<span>{video.year}</span>
								</div>
							)}
							<div className="flex items-center gap-1">
								<HardDrive className="h-3 w-3" />
								<span>{formatFileSize(video.fileSize)}</span>
							</div>
						</div>

						{/* ファイル名（ホバー時に表示） */}
						<div
							className={cn(
								"text-xs text-slate-500 transition-all duration-300",
								isHovered
									? "opacity-100 max-h-8"
									: "opacity-0 max-h-0 overflow-hidden",
							)}
						>
							{truncateText(video.fileName, 50)}
						</div>
					</div>
				</div>
			</Link>
			{/* 詳細ボタン（ホバー時に表示） */}
			<div
				className={cn(
					"absolute top-4 right-4 transition-all duration-300",
					isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4",
				)}
			>
				<button
					type="button"
					className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-full transition-colors"
					onClick={(e) => {
						e.preventDefault();
						// TODO: 詳細モーダルを実装
					}}
				>
					<Info className="h-4 w-4 text-white" />
				</button>
			</div>{" "}
			{/* 進行状況バー（視聴進捗があれば表示） */}
			{watchProgressPercentage > 0 && (
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
					<div
						className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
						style={{
							width: `${Math.min(100, Math.max(0, watchProgressPercentage))}%`,
						}}
					/>
				</div>
			)}
		</div>
	);
};

export default VideoCard;
