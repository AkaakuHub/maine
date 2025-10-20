"use client";

import { Download, CheckCircle, X, WifiOff, Loader2 } from "lucide-react";
import { useOfflineStorage } from "../../hooks/useOfflineStorage";

interface VideoDescriptionProps {
	description?: string;
	showDescription: boolean;
	onToggleDescription: () => void;
	filePath?: string;
	videoId?: string;
	title?: string;
}

export default function VideoDescription({
	description,
	showDescription,
	onToggleDescription,
	filePath,
	videoId,
	title,
}: VideoDescriptionProps) {
	const {
		isCached,
		downloadVideo,
		deleteVideo,
		downloadProgress,
		cancelDownload,
		isDownloading,
	} = useOfflineStorage();

	const isVideoCached = filePath ? isCached(filePath) : false;
	const currentDownloadProgress = filePath ? downloadProgress[filePath] : null;
	const downloading = filePath ? isDownloading[filePath] || false : false;

	const handleDownload = async () => {
		if (!filePath || !videoId || !title) return;

		try {
			await downloadVideo(videoId, filePath, title);
		} catch (error) {
			console.error("Download failed:", error);
		}
	};

	const handleDelete = async () => {
		if (!filePath) return;

		try {
			await deleteVideo(filePath);
		} catch (error) {
			console.error("Delete failed:", error);
		}
	};

	const handleCancelDownload = () => {
		if (!filePath) return;
		cancelDownload(filePath);
	};

	return (
		<div className="space-y-4">
			{/* 概要セクション - descriptionがある場合のみ表示 */}
			{description?.trim() && (
				<div>
					<button
						type="button"
						onClick={onToggleDescription}
						className="text-left w-full mb-3"
					>
						<h3 className="text-text font-semibold flex items-center justify-between">
							概要
							<span className="text-primary text-sm font-medium">
								{showDescription ? "簡潔に表示" : "もっと見る"}
							</span>
						</h3>
					</button>

					<p
						className={`text-text-secondary text-sm leading-relaxed transition-all duration-300 whitespace-pre-wrap ${
							showDescription ? "" : "overflow-hidden text-ellipsis"
						}`}
						style={
							!showDescription
								? {
										display: "-webkit-box",
										WebkitLineClamp: 3,
										WebkitBoxOrient: "vertical",
										overflow: "hidden",
									}
								: {}
						}
					>
						{description}
					</p>
				</div>
			)}

			{/* オフライン管理セクション */}
			{filePath && (
				<div className="border-t border-border-muted/50 pt-4">
					<h3 className="text-text font-semibold mb-3 flex items-center gap-2">
						<WifiOff className="h-4 w-4" />
						オフライン再生
					</h3>

					<div className="space-y-3">
						{!isVideoCached && !downloading && (
							<div className="bg-surface/60 rounded-lg p-4 border border-border-muted/50">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-text-secondary mb-1">
											この動画をダウンロードしてオフラインで視聴
										</p>
										<p className="text-xs text-text-secondary">
											インターネット接続なしで再生可能になります
										</p>
									</div>
									<button
										type="button"
										onClick={handleDownload}
										className="text-text-inverse flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors"
									>
										<Download className="h-4 w-4" />
										ダウンロード
									</button>
								</div>
							</div>
						)}

						{downloading && (
							<div className="bg-primary/30 rounded-lg p-4 border border-primary/30">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
										<span className="text-sm text-primary font-medium">
											ダウンロード中...
										</span>
									</div>
									<button
										type="button"
										onClick={handleCancelDownload}
										className="text-text-secondary hover:text-text transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>

								{currentDownloadProgress !== null && (
									<div className="w-full bg-surface-elevated rounded-full h-2">
										<div
											className="bg-primary h-2 rounded-full transition-all duration-300"
											style={{
												width: `${currentDownloadProgress.percentage}%`,
											}}
										/>
									</div>
								)}

								<p className="text-xs text-text-secondary mt-2">
									{currentDownloadProgress !== null
										? `${Math.round(currentDownloadProgress.percentage)}%`
										: "準備中..."}
								</p>
							</div>
						)}

						{isVideoCached && !downloading && (
							<div className="bg-success/30 rounded-lg p-4 border border-success/30">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-success" />
										<div>
											<p className="text-sm text-success font-medium">
												オフライン再生可能
											</p>
											<p className="text-xs text-text-secondary">
												この動画は保存済みです
											</p>
										</div>
									</div>
									<button
										type="button"
										onClick={handleDelete}
										className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated hover:bg-surface-elevated text-text-secondary hover:text-text rounded-lg transition-colors text-sm"
									>
										<X className="h-3 w-3" />
										削除
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
