"use client";

import { useState } from "react";
import { ChevronRight, Play, Clock } from "lucide-react";
import { cn } from "../../libs/utils";
import Button from "../ui/Button";
import { createApiUrl } from "../../utils/api";
import type { PlaylistVideo } from "../../types/Playlist";

interface PlaylistVideoListProps {
	videos: PlaylistVideo[];
	currentVideoId?: string;
	onVideoSelect?: (video: PlaylistVideo) => void;
	className?: string;
}

export function PlaylistVideoList({
	videos,
	currentVideoId,
	onVideoSelect,
	className,
}: PlaylistVideoListProps) {
	const [expanded, setExpanded] = useState(true);

	const formatDuration = (seconds: number | null): string => {
		if (!seconds) return "--:--";
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	};

	const formatEpisode = (episode: number | null, title: string): string => {
		if (!episode) return title;
		return `第${episode}話: ${title}`;
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* プレイリストヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-text">
						プレイリスト ({videos.length}本)
					</h3>
					{videos.length > 0 && (
						<div className="flex items-center gap-1 text-sm text-text-secondary">
							<Clock className="h-4 w-4" />
							<span>
								{formatDuration(
									videos.reduce(
										(total, video) => total + (video.duration || 0),
										0,
									),
								)}
							</span>
						</div>
					)}
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setExpanded(!expanded)}
					className="h-8 w-8 p-0"
				>
					<ChevronRight
						className={cn(
							"h-4 w-4 transition-transform",
							expanded && "rotate-90",
						)}
					/>
				</Button>
			</div>

			{/* 動画リスト */}
			{expanded && (
				<div className="space-y-2 max-h-96 overflow-y-auto">
					{videos.map((video, _index) => {
						const isCurrentVideo = video.videoId === currentVideoId;

						return (
							<button
								key={video.id}
								type="button"
								onClick={() => onVideoSelect?.(video)}
								className={cn(
									"flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors w-full text-left",
									"hover:bg-surface-elevated",
									"focus:outline-2 focus:outline-offset-2 focus:outline-primary",
									isCurrentVideo && "bg-primary/10 border border-primary/30",
								)}
							>
								{/* サムネイル */}
								{video.thumbnailPath && (
									<div className="relative w-16 h-12 sm:w-20 bg-surface rounded overflow-hidden flex-shrink-0">
										<img
											src={createApiUrl(`/thumbnails/${video.thumbnailPath}`)}
											alt={video.title}
											className="w-full h-full object-cover"
											loading="lazy"
										/>
										{isCurrentVideo && (
											<div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
												<Play
													className="h-3 w-3 sm:h-4 sm:w-4 text-primary"
													fill="white"
												/>
											</div>
										)}
									</div>
								)}

								{/* 動画情報 */}
								<div className="flex-1 min-w-0">
									<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
										<h4 className="text-sm font-medium text-text truncate">
											{formatEpisode(video.episode, video.title)}
										</h4>
										<div className="flex items-center gap-1 sm:gap-2 flex-wrap">
											{isCurrentVideo && (
												<span className="text-xs bg-primary text-text-inverse px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
													再生中
												</span>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2 sm:gap-3 text-xs text-text-secondary mt-1">
										<span>{formatDuration(video.duration)}</span>
										{video.year && <span>{video.year}</span>}
									</div>
								</div>
							</button>
						);
					})}

					{videos.length === 0 && (
						<div className="text-center py-8 text-text-secondary">
							このプレイリストには動画がありません
						</div>
					)}
				</div>
			)}
		</div>
	);
}
