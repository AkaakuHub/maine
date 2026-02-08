"use client";

import { ImageOff, Radio } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { cn, formatFileSize } from "../../libs/utils";
import type { VideoFileData } from "../../type";
import { createApiUrl } from "../../utils/api";
import { formatDuration } from "../../utils/constants";
import { parseVideoFileName } from "../../utils/videoFileNameParser";
import { AuthAPI } from "../../api/auth";

interface VideoCardProps {
	video: VideoFileData;
	priority?: boolean;
	className?: string;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	onPlay?: (videoId: string) => void;
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
				const response = await fetch(
					createApiUrl(
						`/progress?filePath=${encodeURIComponent(video.filePath)}`,
					),
					{
						headers: AuthAPI.getAuthHeaders(),
					},
				);

				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data?.watchProgress !== undefined) {
						setWatchProgress(result.data.watchProgress);
					}
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
		onPlay?.(video.videoId);
	};

	return (
		<div
			className={cn(
				"group relative bg-surface/60 rounded-2xl overflow-hidden transition-all duration-300 ease-out",
				"hover:z-10 hover:shadow-xl",
				"border border-border/30 hover:border-border/60",
				"backdrop-blur-sm",
				className,
			)}
		>
			<button
				type="button"
				onClick={handlePlayClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handlePlayClick(e as unknown as React.MouseEvent);
					}
				}}
				className="block cursor-pointer w-full text-left border-0 bg-transparent p-0"
			>
				{/* サムネイル */}
				<div className="relative aspect-video bg-surface-variant overflow-hidden">
					{video.thumbnailPath ? (
						<img
							src={createApiUrl(`/thumbnails/${video.thumbnailPath}`)}
							alt={video.title}
							className="w-full h-full object-cover"
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
						<div className="absolute top-3 left-3">
							<div className="bg-surface-elevated/75 backdrop-blur-sm px-2 rounded">
								<span className="text-text text-xs font-semibold">
									{video.episode}話
								</span>
							</div>
						</div>
					)}
					{/* 動画時間 */}
					{video.duration && (
						<div className="absolute bottom-3 right-3">
							<div className="bg-surface-elevated/75 backdrop-blur-sm px-2 py-1 rounded text-text text-xs font-medium">
								{formatDuration(video.duration)}
							</div>
						</div>
					)}
				</div>

				{/* コンテンツ */}
				<div className="p-4">
					<h3 className="font-bold text-text mb-3 line-clamp-2 leading-tight text-base">
						{parsedInfo.cleanTitle || video.title}
					</h3>

					{/* 放送局情報 */}
					{parsedInfo.broadcastStation && (
						<div className="flex items-center gap-2 mb-3">
							<div className="flex items-center gap-1">
								<div className="w-6 h-6 bg-surface-elevated rounded-full flex items-center justify-center">
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

			{/* 進行状況バー（視聴進捗があれば表示） */}
			{watchProgress > 0 && (
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-elevated">
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
	);
};

export default VideoCard;
