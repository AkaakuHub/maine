"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Radio, MoreHorizontal, Trash2 } from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize } from "@/libs/utils";
import { formatDuration } from "@/utils/constants";
import { createApiUrl } from "@/utils/api";
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
}: VideoCardProps) => {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const {
		isCached,
		deleteVideo,
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
			setShowMenu(false);
		} catch (error) {
			console.error("ダウンロードエラー:", error);
		}
	};

	// 削除処理
	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			await deleteVideo(video.filePath);
			setShowMenu(false);
		} catch (error) {
			console.error("削除エラー:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	// メニューボタンクリック処理
	const handleMenuClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowMenu(!showMenu);
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
					)}
					{/* ダウンロード進行状況オーバーレイ */}
					{isCurrentlyDownloading && currentDownloadProgress && (
						<div className="absolute inset-0 bg-overlay flex items-center justify-center">
							<div className="text-center text-text">
								<Download className="h-8 w-8 mx-auto mb-2 animate-pulse" />
								<div className="text-sm font-medium">
									{Math.round(currentDownloadProgress.percentage)}%
								</div>
								<div className="text-xs text-text-secondary mt-1">
									ダウンロード中...
								</div>
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

			{/* メニューボタン（右上） */}
			{!isCurrentlyDownloading && (
				<div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
					<div className="relative">
						<button
							type="button"
							onClick={handleMenuClick}
							className="w-8 h-8 bg-surface-elevated/75 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-surface-elevated transition-colors"
						>
							<MoreHorizontal className="h-4 w-4 text-text" />
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
												onClick={() => setShowDownloadConfirm(true)}
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
												オフラインデータを削除
											</button>
										)}
									</>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* 進行状況バー（視聴進捗があれば表示） */}
			{video.watchProgress > 0 && (
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-elevated">
					<div
						className="h-full bg-error transition-all duration-300"
						style={{
							width: `${Math.min(100, Math.max(0, video.watchProgress))}%`,
						}}
					/>
				</div>
			)}

			{/* ダウンロード確認ダイアログ */}
			<ConfirmDialog
				isOpen={showDownloadConfirm}
				onClose={() => setShowDownloadConfirm(false)}
				title="動画をダウンロード"
				message={
					<div>
						<p className="text-text-secondary mb-2">
							この動画をオフライン視聴用にダウンロードしますか？
						</p>
						<p className="text-sm text-text-secondary">
							ファイル名: {video.fileName}
						</p>
						<p className="text-sm text-text-secondary">
							サイズ: {formatFileSize(video.fileSize)}
						</p>
					</div>
				}
				icon={Download}
				iconColor="text-primary"
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
