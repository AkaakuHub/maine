"use client";

import { Calendar, Clock, HardDrive, Play, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn, formatFileSize } from "../../libs/utils";
import type { VideoFileData } from "../../type";
import { createApiUrl } from "../../utils/api";
import { parseVideoFileName } from "../../utils/videoFileNameParser";
import { AuthAPI } from "../../api/auth";

interface VideoListItemProps {
	video: VideoFileData;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	onPlay?: (id: string) => void;
}

export const VideoListItem = ({ video, onPlay }: VideoListItemProps) => {
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
				console.warn("Failed to fetch progress for video list item:", error);
			} finally {
				setIsLoadingProgress(false);
			}
		};

		fetchProgress();
	}, [video.filePath]);

	// 再生ボタンのクリック処理
	const handlePlayClick = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onPlay?.(video.id);
	};

	return (
		<div
			className={cn(
				"group rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-surface-elevated hover:shadow-lg",
			)}
		>
			<div
				className="block p-4"
				onClick={handlePlayClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						handlePlayClick(e);
					}
				}}
			>
				<div className="flex items-center gap-4">
					{/* サムネイル */}
					<div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-variant">
						{video.thumbnailPath ? (
							<img
								src={createApiUrl(`/thumbnails/${video.thumbnailPath}`)}
								alt={video.title}
								crossOrigin="use-credentials"
								className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
								loading="lazy"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<Play className="h-6 w-6 text-text-secondary group-hover:text-text transition-colors" />
							</div>
						)}

						{/* 再生ボタンオーバーレイ */}
						<div className="absolute inset-0 flex items-center justify-center bg-overlay/50 opacity-0 transition-opacity group-hover:opacity-100">
							<Play className="h-8 w-8 text-text" />
						</div>
					</div>

					{/* メインコンテンツ */}
					<div className="flex-1 min-w-0">
						<div className="flex items-start gap-4">
							<div className="min-w-0 flex-1">
								<h3 className="mb-1 truncate text-lg font-semibold text-text">
									{parsedInfo.cleanTitle || video.title}
								</h3>
								<p className="mb-2 truncate text-sm text-text-secondary">
									{video.fileName}
								</p>

								{/* 番組情報 */}
								{(parsedInfo.broadcastStation ||
									parsedInfo.weeklySchedule ||
									parsedInfo.broadcastDate) && (
									<div className="mb-2 flex flex-wrap gap-2">
										{parsedInfo.broadcastStation && (
											<span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-1 text-xs text-text">
												<Radio className="h-3 w-3" />
												{parsedInfo.broadcastStation}
											</span>
										)}
										{parsedInfo.weeklySchedule && (
											<span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-1 text-xs text-text">
												<Clock className="h-3 w-3" />
												{parsedInfo.weeklySchedule}
											</span>
										)}
									</div>
								)}

								{/* メタデータ */}
								<div className="flex items-center gap-4 text-xs text-text-secondary">
									{video.episode && (
										<div className="flex items-center gap-1">
											<div className="w-2 h-2 bg-primary rounded-full" />
											<span>EP. {video.episode}</span>
										</div>
									)}
									{parsedInfo.broadcastDate && (
										<div className="flex items-center gap-1">
											<Calendar className="h-3 w-3" />
											<span>
												{parsedInfo.broadcastDate.getFullYear()}/
												{(parsedInfo.broadcastDate.getMonth() + 1)
													.toString()
													.padStart(2, "0")}
												/
												{parsedInfo.broadcastDate
													.getDate()
													.toString()
													.padStart(2, "0")}{" "}
												{parsedInfo.timeSlot}
											</span>
										</div>
									)}
									<div className="flex items-center gap-1">
										<HardDrive className="h-3 w-3" />
										<span>{formatFileSize(video.fileSize)}</span>
									</div>
								</div>
							</div>
						</div>

						{/* 進行状況バー */}
						{watchProgress > 0 && (
							<div className="mt-3">
								<div className="w-full h-1 bg-surface-elevated rounded-full overflow-hidden">
									<div
										className={cn(
											"h-full bg-primary transition-all duration-300",
											isLoadingProgress && "opacity-50",
										)}
										style={{
											width: `${Math.min(100, Math.max(0, watchProgress))}%`,
										}}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
