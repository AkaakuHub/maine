"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	Play,
	Calendar,
	HardDrive,
	Download,
	Radio,
	Clock,
} from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize, truncateText } from "@/libs/utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { parseVideoFileName } from "@/utils/videoFileNameParser";

interface VideoCardProps {
	video: VideoFileData;
	priority?: boolean;
	className?: string;
	isOfflineMode?: boolean;
	onDelete?: (filePath: string) => void;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	enableDownload?: boolean; // ダウンロード機能を有効にするかどうか
}

const VideoCard = ({
	video,
	className,
	isOfflineMode = false,
	onShowStreamingWarning,
	enableDownload = false,
}: VideoCardProps) => {
	const router = useRouter();
	const [isHovered, setIsHovered] = useState(false);
	// const [isDeleting, setIsDeleting] = useState(false);
	const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
	const {
		isCached,
		// deleteVideo,
		downloadVideo,
		isDownloading,
		downloadProgress,
	} = useOfflineStorage();

	// ファイル名から番組情報をパース
	const parsedInfo = useMemo(() => {
		const fileName = video.filePath.split(/[/\\]/).pop() || video.filePath;
		return parseVideoFileName(fileName);
	}, [video.filePath]);

	// オフライン保存状態をチェック
	const isVideoCached = isCached(video.filePath);
	const currentDownloadProgress = downloadProgress[video.filePath];
	const isCurrentlyDownloading = isDownloading[video.filePath];

	// ダウンロード処理
	const handleDownload = async () => {
		try {
			await downloadVideo(video.filePath, video.title);
			setShowDownloadConfirm(false);
		} catch (error) {
			console.error("ダウンロードエラー:", error);
		}
	};

	// 再生処理（直接再生）
	const handlePlayClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (isOfflineMode) {
			// オフラインモードでは直接オフライン再生
			router.push(`/play/${encodeURIComponent(video.filePath)}?offline=true`);
		} else {
			// ストリーミングモードでオフライン版がある場合は警告を表示
			if (isVideoCached && onShowStreamingWarning) {
				onShowStreamingWarning(video);
			} else {
				// オフライン版がない場合は直接ストリーミング再生
				router.push(`/play/${encodeURIComponent(video.filePath)}`);
			}
		}
	};

	return (
		<div
			className={cn(
				"group relative bg-slate-800/40 rounded-xl overflow-hidden transition-all duration-300 ease-out",
				"hover:scale-[1.02] hover:z-10 hover:shadow-2xl hover:shadow-purple-500/20",
				"border border-slate-700/50 hover:border-purple-400/50",
				// isDeleting && "opacity-50 pointer-events-none",
				className,
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
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
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
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
								{/* ダウンロードボタン */}
								{enableDownload &&
									!isOfflineMode &&
									!isVideoCached &&
									!isCurrentlyDownloading && (
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setShowDownloadConfirm(true);
											}}
											className="backdrop-blur-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
										>
											<Download className="h-4 w-4 text-white" />
										</button>
									)}
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
					{/* 年 */}
					{video.year && (
						<div className="absolute top-3 right-3">
							<div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
								<span className="text-white text-xs font-medium">
									{video.year}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* コンテンツ */}
				<div className="p-4">
					<h3 className="font-semibold text-white mb-2 line-clamp-2 leading-tight">
						{truncateText(parsedInfo.cleanTitle || video.title, 60)}
					</h3>

					{/* 番組情報 */}
					{(parsedInfo.broadcastStation || parsedInfo.weeklySchedule) && (
						<div className="flex flex-wrap gap-2 mb-2">
							{parsedInfo.broadcastStation && (
								<span className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-green-600 to-teal-600 text-white px-2 py-1 rounded-full">
									<Radio className="h-3 w-3" />
									{parsedInfo.broadcastStation}
								</span>
							)}
							{parsedInfo.weeklySchedule && (
								<span className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-orange-600 to-red-600 text-white px-2 py-1 rounded-full">
									<Clock className="h-3 w-3" />
									{parsedInfo.weeklySchedule}
								</span>
							)}
						</div>
					)}
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
			<div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
				<div
					className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
					style={{
						width: `${video.watchProgress ? Math.min(100, Math.max(0, video.watchProgress)) : 0}%`,
					}}
				/>
			</div>

			{/* ダウンロード確認ダイアログ */}
			<ConfirmDialog
				isOpen={showDownloadConfirm}
				onClose={() => setShowDownloadConfirm(false)}
				title="動画をダウンロード"
				message={
					<div>
						<p className="text-slate-300 mb-2">
							この動画をオフライン視聴用にダウンロードしますか？
						</p>
						<p className="text-sm text-slate-400">
							ファイル名: {video.fileName}
						</p>
						<p className="text-sm text-slate-400">
							サイズ: {formatFileSize(video.fileSize)}
						</p>
					</div>
				}
				icon={Download}
				iconColor="text-blue-400"
				actions={[
					{
						label: "ダウンロード",
						onClick: handleDownload,
						variant: "primary",
						icon: Download,
						description: "オフライン視聴できるようになります",
					},
				]}
			/>
		</div>
	);
};

export default VideoCard;
