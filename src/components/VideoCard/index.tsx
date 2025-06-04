"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Play,
	Clock,
	Calendar,
	HardDrive,
	Info,
	Heart,
	Download,
	Wifi,
	MoreVertical,
	Trash2,
} from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize, truncateText } from "@/libs/utils";
import { useProgress } from "@/hooks/useProgress";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import StreamingWarningDialog from "@/components/StreamingWarningDialog";

interface VideoCardProps {
	video: VideoFileData;
	priority?: boolean;
	className?: string;
	isOfflineMode?: boolean;
	onLikeUpdate?: (filePath: string, isLiked: boolean) => void;
	onDelete?: (filePath: string) => void;
}

const VideoCard = ({
	video,
	priority = false,
	className,
	isOfflineMode = false,
	onLikeUpdate,
	onDelete,
}: VideoCardProps) => {
	const router = useRouter();
	const [isHovered, setIsHovered] = useState(false);
	const [isLiked, setIsLiked] = useState(video.isLiked || false);
	const [showPlayOptions, setShowPlayOptions] = useState(false);
	const [showStreamingWarning, setShowStreamingWarning] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const { updateProgress, loading: progressLoading } = useProgress();
	const {
		isCached,
		deleteVideo,
		downloadVideo,
		isDownloading,
		downloadProgress,
	} = useOfflineStorage();

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
		setIsLiked(newLikeStatus); // 楽観的更新

		try {
			await updateProgress({
				filePath: video.filePath,
				isLiked: newLikeStatus,
			});
			onLikeUpdate?.(video.filePath, newLikeStatus);
		} catch (error) {
			// エラー時は元に戻す
			setIsLiked(isLiked);
			console.error("Failed to update like status:", error);
		}
	};
	// 視聴進捗の計算
	const watchProgressPercentage = video.watchProgress || 0;

	// オフライン保存状態をチェック
	const isVideoCached = isCached(video.filePath);
	const currentDownloadProgress = downloadProgress[video.filePath];
	const isCurrentlyDownloading = isDownloading[video.filePath];

	// 再生オプションを表示する関数
	const handlePlayClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (isOfflineMode) {
			// オフラインモードでは直接オフライン再生
			handleOfflinePlay();
		} else {
			// ストリーミングモードでは再生オプションを表示
			setShowPlayOptions(true);
		}
	};

	// ストリーミング再生の処理
	const handleStreamingPlay = () => {
		if (isVideoCached) {
			// オフライン版が利用可能な場合は警告を表示
			setShowPlayOptions(false);
			setShowStreamingWarning(true);
		} else {
			// オフライン版がない場合は直接ストリーミング再生
			router.push(`/play/${encodeURIComponent(video.filePath)}`);
		}
	};

	// オフライン再生の処理
	const handleOfflinePlay = () => {
		router.push(`/play/${encodeURIComponent(video.filePath)}?offline=true`);
	};

	// 警告ダイアログからストリーミングを続行
	const handleContinueStreaming = () => {
		setShowStreamingWarning(false);
		router.push(`/play/${encodeURIComponent(video.filePath)}`);
	};

	// 警告ダイアログからオフライン再生を選択
	const handleUseOfflineFromWarning = () => {
		setShowStreamingWarning(false);
		handleOfflinePlay();
	};

	// メニューボタンのクリック
	const handleMenuClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(!showMenu);
	};

	// ダウンロード
	const handleDownload = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(false);

		try {
			await downloadVideo(video.filePath, video.title);
		} catch (error) {
			console.error("Failed to download video:", error);
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

	return (
		<div
			className={cn(
				"group relative bg-slate-800/40 rounded-xl overflow-hidden transition-all duration-300 ease-out",
				"hover:scale-[1.02] hover:z-10 hover:shadow-2xl hover:shadow-purple-500/20",
				"border border-slate-700/50 hover:border-purple-400/50",
				isDeleting && "opacity-50 pointer-events-none",
				className,
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{" "}
			{/* 再生オプションのモーダル */}
			{showPlayOptions && (
				<dialog
					open
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
					onClick={() => setShowPlayOptions(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setShowPlayOptions(false);
						}
					}}
					aria-modal="true"
				>
					{" "}
					<div
						className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-slate-700"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						role="document"
					>
						<h3 className="text-lg font-bold text-white mb-4">{video.title}</h3>
						<div className="space-y-3">
							{" "}
							{/* ストリーミング再生 */}
							<button
								type="button"
								onClick={handleStreamingPlay}
								className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
							>
								<Wifi className="h-5 w-5" />
								<div>
									<div className="font-medium">ストリーミング再生</div>
									<div className="text-xs opacity-80">
										インターネット接続が必要
									</div>
								</div>
							</button>
							{/* オフライン再生 */}
							{isVideoCached ? (
								<button
									type="button"
									onClick={handleOfflinePlay}
									className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors"
								>
									<Download className="h-5 w-5" />
									<div>
										<div className="font-medium">オフライン再生</div>
										<div className="text-xs opacity-80">
											保存済みの動画を再生
										</div>
									</div>
								</button>
							) : (
								<div className="w-full flex items-center gap-3 p-3 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed">
									<Download className="h-5 w-5" />
									<div>
										<div className="font-medium">オフライン再生</div>
										<div className="text-xs">動画が保存されていません</div>
									</div>
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={() => setShowPlayOptions(false)}
							className="w-full mt-4 p-2 text-slate-400 hover:text-white transition-colors"
						>
							キャンセル
						</button>
					</div>
				</dialog>
			)}
			{/* 警告ダイアログ */}
			<StreamingWarningDialog
				isOpen={showStreamingWarning}
				onClose={() => setShowStreamingWarning(false)}
				onContinueStreaming={handleContinueStreaming}
				onUseOffline={handleUseOfflineFromWarning}
				videoTitle={video.title}
			/>
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
				<div className="relative aspect-video bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
					<div className="w-full h-full flex items-center justify-center">
						<Play className="h-12 w-12 text-slate-400 transition-colors group-hover:text-white" />
					</div>
					{/* ダウンロード進行状況オーバーレイ */}
					{isCurrentlyDownloading && currentDownloadProgress && (
						<div className="absolute inset-0 bg-black/80 flex items-center justify-center">
							<div className="text-center text-white">
								<Download className="h-8 w-8 mx-auto mb-2 animate-pulse" />
								<div className="text-sm font-medium">
									{Math.round(currentDownloadProgress.percentage)}%
								</div>
								<div className="text-xs text-slate-300 mt-1">
									ダウンロード中...
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
								<div
									className={cn(
										"backdrop-blur-sm px-3 py-1 rounded-full",
										isOfflineMode ? "bg-green-500/20" : "bg-white/20",
									)}
								>
									<Play
										className={cn(
											"h-4 w-4",
											isOfflineMode ? "text-green-400" : "text-white",
										)}
									/>
								</div>
								<span className="text-white text-sm font-medium">
									{isOfflineMode ? "オフライン再生" : "再生"}
								</span>
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

						{/* メニューボタン */}
						<div className="relative" ref={menuRef}>
							<button
								type="button"
								onClick={handleMenuClick}
								className="bg-black/70 backdrop-blur-sm p-1.5 rounded-md transition-all duration-200 hover:bg-black/90 text-white/70 hover:text-white"
							>
								<MoreVertical className="h-4 w-4" />
							</button>

							{/* ドロップダウンメニュー */}
							{showMenu && (
								<div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 min-w-[160px]">
									{/* ストリーミングモードでのダウンロードボタン */}
									{!isOfflineMode && !isVideoCached && (
										<button
											type="button"
											onClick={handleDownload}
											disabled={isCurrentlyDownloading}
											className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<Download className="h-4 w-4" />
											オフライン保存
										</button>
									)}

									{/* オフラインモードでの削除ボタン */}
									{isOfflineMode && (
										<button
											type="button"
											onClick={handleDelete}
											disabled={isDeleting}
											className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<Trash2 className="h-4 w-4" />
											削除
										</button>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* コンテンツ */}
				<div className="p-4">
					<h3 className="font-semibold text-white mb-2 line-clamp-2 leading-tight">
						{truncateText(video.title, 60)}
					</h3>{" "}
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

						{/* ファイル名（ホバー時に表示） - 高さを固定 */}
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
							</div>{" "}
						</div>
					</div>
				</div>
			</button>
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
