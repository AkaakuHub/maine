"use client";

import { ImageOff, Radio } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { createThumbnailUrl } from "../../application/services/media-resource-service";
import { loadVideoProgress } from "../../application/services/progress-service";
import { cn, formatFileSize } from "../../libs/utils";
import type { VideoFileData } from "../../type";
import { formatDuration } from "../../utils/constants";
import { parseVideoFileName } from "../../utils/videoFileNameParser";

interface VideoCardProps {
	video: VideoFileData;
	priority?: boolean;
	className?: string;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	onPlay?: (id: string) => void;
}

const VideoCard = ({ video, className, onPlay }: VideoCardProps) => {
	// 進捗取得用state
	const [watchProgress, setWatchProgress] = useState<number>(0);
	const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(false);

	// ファイル名から番組情報をパース
	const parsedInfo = useMemo(() => {
		const fileName = video.filePath.split(/[/\\]/).pop() || video.filePath;
		return parseVideoFileName(fileName);
	}, [video.filePath]);

	// 進捗情報を取得
	useEffect(() => {
		const fetchProgress = async () => {
			if (!video.filePath) return;

			try {
				setIsLoadingProgress(true);
				const progress = await loadVideoProgress(video.filePath);
				if (progress.watchProgress !== undefined) {
					setWatchProgress(progress.watchProgress);
				}
			} catch (error) {
				console.warn("Failed to fetch progress for video card:", error);
			} finally {
				setIsLoadingProgress(false);
			}
		};

		fetchProgress();
	}, [video.filePath]);

	// 再生処理
	const handlePlayClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onPlay?.(video.id);
	};

	const handlePlayKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			e.stopPropagation();
			onPlay?.(video.id);
		}
	};

	return (
		<div
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 ease-out",
				"shadow-sm hover:z-10 hover:border-primary/30 hover:bg-surface-elevated hover:shadow-xl",
				className,
			)}
		>
			<button
				type="button"
				onClick={handlePlayClick}
				onKeyDown={handlePlayKeyDown}
				className="block cursor-pointer w-full text-left border-0 bg-transparent p-0"
			>
				{/* サムネイル */}
				<div className="relative aspect-video overflow-hidden bg-surface-variant">
					{video.thumbnailPath ? (
						<img
							src={createThumbnailUrl(video.thumbnailPath)}
							alt={video.title}
							className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
							loading="lazy"
						/>
					) : (
						// フォールバック: 装飾的なグリッド
						<div className="absolute inset-0">
							<div className="absolute inset-0 opacity-10">
								<div
									className="w-full h-full"
									style={{
										backgroundImage:
											"linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
										backgroundSize: "20px 20px",
									}}
								/>
							</div>
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<ImageOff className="h-8 w-8 text-text-secondary opacity-70" />
							</div>
						</div>
					)}
					{/* エピソード番号 */}
					{video.episode && (
						<div className="absolute left-3 top-3">
							<div className="rounded-md border border-border/40 bg-surface/85 px-2 backdrop-blur-sm">
								<span className="text-text text-xs font-semibold">
									{video.episode}話
								</span>
							</div>
						</div>
					)}
					{/* 動画時間 */}
					{video.duration && (
						<div className="absolute bottom-3 right-3">
							<div className="rounded-md border border-border/40 bg-surface/85 px-2 py-1 text-xs font-medium text-text backdrop-blur-sm">
								{formatDuration(video.duration)}
							</div>
						</div>
					)}

					{watchProgress > 0 && (
						<div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-elevated/90">
							<div
								className={cn(
									"h-full bg-error transition-all duration-300",
									isLoadingProgress && "opacity-50",
								)}
								style={{
									width: `${Math.min(100, Math.max(0, watchProgress))}%`,
								}}
							/>
						</div>
					)}
				</div>

				{/* コンテンツ */}
				<div className="border-t border-border bg-surface px-4 py-4">
					<h3 className="mb-3 line-clamp-2 text-base font-bold leading-tight text-text">
						{parsedInfo.cleanTitle || video.title}
					</h3>

					{/* 放送局情報 */}
					{parsedInfo.broadcastStation && (
						<div className="mb-3 flex items-center gap-2">
							<div className="flex items-center gap-1">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-elevated">
									<Radio className="h-3 w-3 text-text-secondary" />
								</div>
								<span className="text-sm text-text-secondary font-medium">
									{parsedInfo.broadcastStation}
								</span>
							</div>
							{parsedInfo.weeklySchedule && (
								<span className="text-xs text-text-muted">
									{parsedInfo.weeklySchedule}
								</span>
							)}
						</div>
					)}
					{/* メタデータ */}
					<div className="flex items-center gap-3 text-xs text-text-secondary">
						{parsedInfo.broadcastDate ? (
							<span>
								{parsedInfo.broadcastDate.getFullYear()}/
								{(parsedInfo.broadcastDate.getMonth() + 1)
									.toString()
									.padStart(2, "0")}
								/
								{parsedInfo.broadcastDate.getDate().toString().padStart(2, "0")}
							</span>
						) : video.fileModifiedAt ? (
							<span>
								{new Date(video.fileModifiedAt).getFullYear()}/
								{(new Date(video.fileModifiedAt).getMonth() + 1)
									.toString()
									.padStart(2, "0")}
								/
								{new Date(video.fileModifiedAt)
									.getDate()
									.toString()
									.padStart(2, "0")}
							</span>
						) : null}
						<span>•</span>
						<span>{formatFileSize(video.fileSize)}</span>
					</div>
				</div>
			</button>
		</div>
	);
};

export default VideoCard;
