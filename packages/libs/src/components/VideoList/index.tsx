"use client";

import {
	Calendar,
	Clock,
	HardDrive,
	Info,
	MoreHorizontal,
	Play,
	Radio,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn, formatFileSize } from "../../libs/utils";
import type { VideoFileData } from "../../type";
import { createApiUrl } from "../../utils/api";
import { parseVideoFileName } from "../../utils/videoFileNameParser";
import { AuthAPI } from "../../api/auth";

interface VideoListProps {
	videos: VideoFileData[];
	className?: string;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	onPlay?: (id: string) => void;
}

const VideoListItem = ({
	video,
	onPlay,
}: {
	video: VideoFileData;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	onPlay?: (id: string) => void;
}) => {
	const [showMenu, setShowMenu] = useState(false);
	const [watchProgress, setWatchProgress] = useState<number>(0);
	const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(false);
	const menuRef = useRef<HTMLDivElement>(null);

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
		onPlay?.(video.id);
	};

	return (
		<div
			className={cn(
				"group bg-surface/30 hover:bg-surface/50 backdrop-blur-sm rounded-xl border border-border-muted/50 hover:border-primary/30 transition-all duration-300",
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

						{/* 再生ボタンオーバーレイ */}
						<div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<Play className="h-8 w-8 text-text" />
						</div>
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
								</div>
							</div>

							{/* アクションボタン */}
							<div className="flex items-center gap-2 relative" ref={menuRef}>
								<button
									type="button"
									className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
									onClick={(e) => {
										e.preventDefault();
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
										<button
											type="button"
											onClick={() => setShowMenu(false)}
											className="w-full px-4 py-2 text-left text-text hover:bg-surface-elevated rounded-lg transition-colors"
										>
											閉じる
										</button>
									</div>
								)}
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

const VideoList = ({
	videos,
	className,
	onShowStreamingWarning,
	onPlay,
}: VideoListProps) => {
	return (
		<div className={cn("space-y-3", className)}>
			{videos.map((video) => (
				<VideoListItem
					key={video.id}
					video={video}
					onShowStreamingWarning={onShowStreamingWarning}
					onPlay={onPlay}
				/>
			))}
		</div>
	);
};

export default VideoList;
