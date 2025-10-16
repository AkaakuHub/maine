"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	Play,
	Calendar,
	HardDrive,
	Clock,
	Info,
	MoreHorizontal,
	Download,
	Trash2,
	Radio,
} from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize } from "@/libs/utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { parseVideoFileName } from "@/utils/videoFileNameParser";
import { SafeDateDisplay } from "@/components/common/SafeDateDisplay";
import { createApiUrl } from "@/utils/api";

interface VideoListProps {
	videos: VideoFileData[];
	className?: string;
	isOfflineMode?: boolean;
	onDelete?: (filePath: string) => void;
	onShowStreamingWarning?: (video: VideoFileData) => void;
}

const VideoListItem = ({
	video,
	isOfflineMode = false,
	onDelete,
	onShowStreamingWarning,
}: {
	video: VideoFileData;
	isOfflineMode?: boolean;
	onDelete?: (filePath: string) => void;
	onShowStreamingWarning?: (video: VideoFileData) => void;
}) => {
	const router = useRouter();
	const [showMenu, setShowMenu] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const {
		downloadVideo,
		deleteVideo,
		isDownloading,
		downloadProgress,
		isCached,
	} = useOfflineStorage();

	// ファイル名から番組情報をパース
	const parsedInfo = useMemo(() => {
		const fileName = video.filePath.split(/[/\\]/).pop() || video.filePath;
		return parseVideoFileName(fileName);
	}, [video.filePath]);

	const watchProgressPercentage = video.watchProgress || 0;
	const isVideoCached = isCached(video.filePath);
	const currentDownloadProgress = downloadProgress[video.filePath];
	const isCurrentlyDownloading = isDownloading[video.filePath];

	// メニューの外側クリックでメニューを閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		};

		if (showMenu) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showMenu]);

	// メニューボタンのクリック
	const handleMenuClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(!showMenu);
	};

	// 再生ボタンのクリック処理
	const handlePlayClick = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (isOfflineMode) {
			// オフラインモードでは直接オフライン再生
			router.push(`/play/${encodeURIComponent(video.videoId)}?offline=true`);
		} else {
			// ストリーミングモードでは警告チェック
			if (isVideoCached && onShowStreamingWarning) {
				onShowStreamingWarning(video);
			} else {
				router.push(`/play/${encodeURIComponent(video.videoId)}`);
			}
		}
	};

	// ダウンロード処理
	const handleDownload = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(false);

		try {
			await downloadVideo(video.filePath, video.title);
		} catch (error) {
			console.error("ダウンロードエラー:", error);
		}
	};

	// 削除処理
	const handleDelete = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(false);
		setIsDeleting(true);

		try {
			await deleteVideo(video.filePath);
			onDelete?.(video.filePath);
		} catch (error) {
			console.error("削除エラー:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div
			className={cn(
				"group bg-surface/30 hover:bg-surface/50 backdrop-blur-sm rounded-xl border border-border-muted/50 hover:border-primary/30 transition-all duration-300",
				isDeleting && "opacity-50 pointer-events-none",
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
					<div className="relative w-28 h-16 bg-surface-variant rounded-lg overflow-hidden flex-shrink-0">
						{video.thumbnailPath ? (
							<img
								src={createApiUrl(`/thumbnails/${video.thumbnailPath}`)}
								alt={video.title}
								className="w-full h-full object-cover"
								loading="lazy"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Play className="h-6 w-6 text-text-secondary group-hover:text-text transition-colors" />
							</div>
						)}

						{/* ダウンロード進行状況オーバーレイ */}
						{isCurrentlyDownloading &&
							currentDownloadProgress !== undefined && (
								<div className="absolute inset-0 bg-overlay flex items-center justify-center">
									<div className="text-center">
										<div className="w-6 h-6 border-2 border-primary border-t-blue-500 rounded-full animate-spin mb-1" />
										<div className="text-text text-xs">
											{Math.round(currentDownloadProgress.percentage || 0)}%
										</div>
									</div>
								</div>
							)}

						{/* 再生ボタンオーバーレイ */}
						{!isCurrentlyDownloading && (
							<div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<Play className="h-8 w-8 text-text" />
							</div>
						)}
					</div>

					{/* メインコンテンツ */}
					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-text mb-1 truncate text-lg">
									{parsedInfo.cleanTitle || video.title}
								</h3>
								<p className="text-sm text-text-secondary truncate mb-2">
									{video.fileName}
								</p>

								{/* 番組情報 */}
								{(parsedInfo.broadcastStation ||
									parsedInfo.weeklySchedule ||
									parsedInfo.broadcastDate) && (
									<div className="flex flex-wrap gap-2 mb-2">
										{parsedInfo.broadcastStation && (
											<span className="inline-flex items-center gap-1 text-xs bg-success text-text-inverse px-2 py-1 rounded-full">
												<Radio className="h-3 w-3" />
												{parsedInfo.broadcastStation}
											</span>
										)}
										{parsedInfo.weeklySchedule && (
											<span className="inline-flex items-center gap-1 text-xs bg-warning text-text-inverse px-2 py-1 rounded-full">
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
									{video.lastWatched && (
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span>
												最後に視聴:{" "}
												<SafeDateDisplay
													date={video.lastWatched}
													format="date"
													fallback="---"
												/>
											</span>
										</div>
									)}
								</div>
							</div>

							{/* アクションボタン */}
							<div className="flex items-center gap-2 relative" ref={menuRef}>
								<button
									type="button"
									className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
									onClick={(e) => {
										e.preventDefault();
										console.log("詳細情報:", video);
									}}
								>
									<Info className="h-4 w-4" />
								</button>
								<button
									type="button"
									className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
									onClick={handleMenuClick}
								>
									<MoreHorizontal className="h-4 w-4" />
								</button>

								{/* コンテキストメニュー */}
								{showMenu && (
									<div className="absolute right-0 top-full mt-2 bg-surface border border-border-muted rounded-lg shadow-xl z-20 min-w-[160px]">
										{isOfflineMode ? (
											<button
												type="button"
												onClick={handleDelete}
												disabled={isDeleting}
												className="w-full px-4 py-2 text-left text-error hover:bg-surface-elevated rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<Trash2 className="h-4 w-4" />
												削除
											</button>
										) : (
											<>
												{!isVideoCached && !isCurrentlyDownloading && (
													<button
														type="button"
														onClick={handleDownload}
														className="w-full px-4 py-2 text-left text-primary hover:bg-surface-elevated rounded-lg transition-colors flex items-center gap-2"
													>
														<Download className="h-4 w-4" />
														ダウンロード
													</button>
												)}
												{isVideoCached && (
													<button
														type="button"
														onClick={handleDelete}
														disabled={isDeleting}
														className="w-full px-4 py-2 text-left text-error hover:bg-surface-elevated rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
													>
														<Trash2 className="h-4 w-4" />
														削除
													</button>
												)}
											</>
										)}
									</div>
								)}
							</div>
						</div>

						{/* 進行状況バー */}
						{video.lastWatched && (
							<div className="mt-3">
								<div className="w-full h-1 bg-surface-elevated rounded-full overflow-hidden">
									<div
										className="h-full bg-primary transition-all duration-300"
										style={{
											width: `${Math.min(100, Math.max(0, watchProgressPercentage))}%`,
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

const VideoList = ({
	videos,
	className,
	isOfflineMode = false,
	onDelete,
	onShowStreamingWarning,
}: VideoListProps) => {
	return (
		<div className={cn("space-y-3", className)}>
			{videos.map((video) => (
				<VideoListItem
					key={video.id}
					video={video}
					isOfflineMode={isOfflineMode}
					onDelete={onDelete}
					onShowStreamingWarning={onShowStreamingWarning}
				/>
			))}
		</div>
	);
};

export default VideoList;
