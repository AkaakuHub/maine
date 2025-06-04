"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize, truncateText, formatDuration } from "@/libs/utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

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
	const handlePlayClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (isOfflineMode) {
			// オフラインモードでは直接オフライン再生
			router.push(`/play/${encodeURIComponent(video.filePath)}?offline=true`);
		} else {
			// ストリーミングモードでは警告チェック
			if (isVideoCached && onShowStreamingWarning) {
				onShowStreamingWarning(video);
			} else {
				router.push(`/play/${encodeURIComponent(video.filePath)}`);
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
				"group bg-slate-800/30 hover:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-purple-400/30 transition-all duration-300",
				isDeleting && "opacity-50 pointer-events-none",
			)}
		>
			<div className="block p-4" onClick={handlePlayClick}>
				<div className="flex items-center gap-4">
					{/* サムネイル */}
					<div className="relative w-28 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg overflow-hidden flex-shrink-0">
						<div className="w-full h-full flex items-center justify-center">
							<Play className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors" />
						</div>

						{/* ダウンロード進行状況オーバーレイ */}
						{isCurrentlyDownloading &&
							currentDownloadProgress !== undefined && (
								<div className="absolute inset-0 bg-black/75 flex items-center justify-center">
									<div className="text-center">
										<div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-1" />
										<div className="text-white text-xs">
											{Math.round(currentDownloadProgress.percentage || 0)}%
										</div>
									</div>
								</div>
							)}

						{/* 再生ボタンオーバーレイ */}
						{!isCurrentlyDownloading && (
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<Play className="h-8 w-8 text-white" />
							</div>
						)}
					</div>

					{/* メインコンテンツ */}
					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-white mb-1 truncate text-lg">
									{video.title}
								</h3>
								<p className="text-sm text-slate-400 truncate mb-2">
									{video.fileName}
								</p>

								{/* メタデータ */}
								<div className="flex items-center gap-4 text-xs text-slate-400">
									{video.episode && (
										<div className="flex items-center gap-1">
											<div className="w-2 h-2 bg-blue-400 rounded-full" />
											<span>EP. {video.episode}</span>
										</div>
									)}
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
									{video.lastWatched && (
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span>
												最後に視聴:{" "}
												{new Date(video.lastWatched).toLocaleDateString()}
											</span>
										</div>
									)}
								</div>
							</div>

							{/* アクションボタン */}
							<div className="flex items-center gap-2 relative" ref={menuRef}>
								<button
									type="button"
									className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
									onClick={(e) => {
										e.preventDefault();
										// TODO: 詳細モーダルを実装
									}}
								>
									<Info className="h-4 w-4" />
								</button>
								<button
									type="button"
									className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
									onClick={handleMenuClick}
								>
									<MoreHorizontal className="h-4 w-4" />
								</button>

								{/* コンテキストメニュー */}
								{showMenu && (
									<div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 min-w-[160px]">
										{isOfflineMode ? (
											<button
												type="button"
												onClick={handleDelete}
												disabled={isDeleting}
												className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
														className="w-full px-4 py-2 text-left text-blue-400 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
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
														className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
								<div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
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
			{videos.map((video, index) => (
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
