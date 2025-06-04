"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Play,
	MoreVertical,
	Download,
	Trash2,
	Calendar,
	HardDrive,
	Heart,
} from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize, truncateText } from "@/libs/utils";
import { useProgress } from "@/hooks/useProgress";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

interface OfflineVideoCardProps {
	video: VideoFileData;
	onDelete?: (filePath: string) => void;
	onLikeUpdate?: (filePath: string, isLiked: boolean) => void;
	className?: string;
}

const OfflineVideoCard = ({
	video,
	onDelete,
	onLikeUpdate,
	className,
}: OfflineVideoCardProps) => {
	const router = useRouter();
	const [isHovered, setIsHovered] = useState(false);
	const [isLiked, setIsLiked] = useState(video.isLiked || false);
	const [showMenu, setShowMenu] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const { updateProgress, loading: progressLoading } = useProgress();
	const { deleteVideo, downloadVideo, isDownloading, downloadProgress } =
		useOfflineStorage();

	// メニューの外側クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// ライクボタンの処理
	const handleLikeToggle = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const newLikeStatus = !isLiked;
		setIsLiked(newLikeStatus);

		try {
			await updateProgress({
				filePath: video.filePath,
				isLiked: newLikeStatus,
			});
			onLikeUpdate?.(video.filePath, newLikeStatus);
		} catch (error) {
			setIsLiked(isLiked);
			console.error("Failed to update like status:", error);
		}
	};

	// オフライン再生
	const handlePlay = () => {
		router.push(`/play/${encodeURIComponent(video.filePath)}?offline=true`);
	};

	// メニューボタンのクリック
	const handleMenuClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(!showMenu);
	};

	// 再ダウンロード
	const handleRedownload = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(false);

		try {
			await downloadVideo(video.filePath, video.title);
		} catch (error) {
			console.error("Failed to redownload video:", error);
		}
	};

	// 削除
	const handleDelete = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(false);
		setIsDeleting(true);

		try {
			await deleteVideo(video.filePath);
			onDelete?.(video.filePath);
		} catch (error) {
			console.error("Failed to delete video:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	// 視聴進捗の計算
	const watchProgressPercentage = video.watchProgress || 0;
	const currentDownloadProgress = downloadProgress[video.filePath];
	const isCurrentlyDownloading = isDownloading[video.filePath];

	return (
		<div
			className={cn(
				"group relative bg-slate-800/40 rounded-xl overflow-hidden transition-all duration-300 ease-out",
				"hover:scale-[1.02] hover:z-10 hover:shadow-2xl hover:shadow-green-500/20",
				"border border-slate-700/50 hover:border-green-400/50",
				isDeleting && "opacity-50 pointer-events-none",
				className,
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div onClick={handlePlay} className="block cursor-pointer">
				{/* サムネイル */}
				<div className="relative aspect-video bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
					<div className="w-full h-full flex items-center justify-center">
						<Play className="h-12 w-12 text-slate-400 transition-colors group-hover:text-white" />
					</div>

					{/* ダウンロード進行状況オーバーレイ */}
					{isCurrentlyDownloading && currentDownloadProgress && (
						<div className="absolute inset-0 bg-black/80 flex items-center justify-center">
							{" "}
							<div className="text-center text-white">
								<Download className="h-8 w-8 mx-auto mb-2 animate-pulse" />
								<div className="text-sm font-medium">
									{Math.round(currentDownloadProgress.percentage)}%
								</div>
								<div className="text-xs text-slate-300 mt-1">
									再ダウンロード中...
								</div>
							</div>
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
								<div className="bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
									<Play className="h-4 w-4 text-green-400" />
								</div>
								<span className="text-white text-sm font-medium">
									オフライン再生
								</span>
							</div>
						</div>
					</div>

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

					{/* ライクボタンとメニュー */}
					<div className="absolute top-3 right-3 flex gap-2">
						{video.year && (
							<div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
								<span className="text-white text-xs font-medium">
									{video.year}
								</span>
							</div>
						)}

						{/* ライクボタン */}
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

						{/* メニューボタン */}
						<div className="relative" ref={menuRef}>
							<button
								onClick={handleMenuClick}
								className="bg-black/70 backdrop-blur-sm p-1.5 rounded-md transition-all duration-200 hover:bg-black/90 text-white/70 hover:text-white"
							>
								<MoreVertical className="h-4 w-4" />
							</button>

							{/* ドロップダウンメニュー */}
							{showMenu && (
								<div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 min-w-[160px]">
									<button
										onClick={handleRedownload}
										disabled={isCurrentlyDownloading}
										className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Download className="h-4 w-4" />
										再ダウンロード
									</button>
									<button
										onClick={handleDelete}
										disabled={isDeleting}
										className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Trash2 className="h-4 w-4" />
										削除
									</button>
								</div>
							)}
						</div>
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
							{/* オフライン表示 */}
							<div className="flex items-center gap-1 text-green-400">
								<Download className="h-3 w-3" />
								<span>オフライン</span>
							</div>
						</div>

						{/* ファイル名（ホバー時に表示） */}
						<div className="h-8 overflow-hidden">
							<div
								className={cn(
									"text-xs text-slate-500 transition-all duration-300",
									isHovered
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-2",
								)}
							>
								{truncateText(video.fileName, 50)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 進行状況バー（視聴進捗があれば表示） */}
			{watchProgressPercentage > 0 && (
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
					<div
						className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-300"
						style={{
							width: `${Math.min(100, Math.max(0, watchProgressPercentage))}%`,
						}}
					/>
				</div>
			)}
		</div>
	);
};

export default OfflineVideoCard;
