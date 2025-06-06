"use client";

import { Download, CheckCircle, X, WifiOff, Loader2 } from "lucide-react";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

interface VideoDescriptionProps {
	description?: string;
	showDescription: boolean;
	onToggleDescription: () => void;
	filePath?: string;
	title?: string;
}

export default function VideoDescription({
	description,
	showDescription,
	onToggleDescription,
	filePath,
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
		if (!filePath || !title) return;

		try {
			await downloadVideo(filePath, title);
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
			{/* 概要セクション */}
			<div>
				<button
					type="button"
					onClick={onToggleDescription}
					className="text-left w-full mb-3"
				>
					<h3 className="text-white font-semibold flex items-center justify-between">
						概要
						<span className="text-purple-300 text-sm font-medium">
							{showDescription ? "簡潔に表示" : "もっと見る"}
						</span>
					</h3>
				</button>

				<p
					className={`text-slate-300 text-sm leading-relaxed transition-all duration-300 ${
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

			{/* オフライン管理セクション */}
			{filePath && (
				<div className="border-t border-slate-700/50 pt-4">
					<h3 className="text-white font-semibold mb-3 flex items-center gap-2">
						<WifiOff className="h-4 w-4" />
						オフライン再生
					</h3>

					<div className="space-y-3">
						{!isVideoCached && !downloading && (
							<div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-300 mb-1">
											この動画をダウンロードしてオフラインで視聴
										</p>
										<p className="text-xs text-slate-400">
											インターネット接続なしで再生可能になります
										</p>
									</div>
									<button
										type="button"
										onClick={handleDownload}
										className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
									>
										<Download className="h-4 w-4" />
										ダウンロード
									</button>
								</div>
							</div>
						)}

						{downloading && (
							<div className="bg-blue-900/30 rounded-lg p-4 border border-blue-600/30">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin text-blue-400" />
										<span className="text-sm text-blue-300 font-medium">
											ダウンロード中...
										</span>
									</div>
									<button
										type="button"
										onClick={handleCancelDownload}
										className="text-slate-400 hover:text-white transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>

								{currentDownloadProgress !== null && (
									<div className="w-full bg-slate-700 rounded-full h-2">
										<div
											className="bg-blue-500 h-2 rounded-full transition-all duration-300"
											style={{
												width: `${currentDownloadProgress.percentage}%`,
											}}
										/>
									</div>
								)}

								<p className="text-xs text-slate-400 mt-2">
									{currentDownloadProgress !== null
										? `${Math.round(currentDownloadProgress.percentage)}%`
										: "準備中..."}
								</p>
							</div>
						)}

						{isVideoCached && !downloading && (
							<div className="bg-green-900/30 rounded-lg p-4 border border-green-600/30">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-400" />
										<div>
											<p className="text-sm text-green-300 font-medium">
												オフライン再生可能
											</p>
											<p className="text-xs text-slate-400">
												この動画は保存済みです
											</p>
										</div>
									</div>
									<button
										type="button"
										onClick={handleDelete}
										className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
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
