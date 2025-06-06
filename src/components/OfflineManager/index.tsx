"use client";

import { useState } from "react";
import {
	Download,
	Trash2,
	Play,
	HardDrive,
	Clock,
	X,
	Wifi,
	WifiOff,
	AlertCircle,
} from "lucide-react";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { formatFileSize, formatDuration, cn } from "@/libs/utils";

interface OfflineManagerProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function OfflineManager({
	isOpen,
	onClose,
}: OfflineManagerProps) {
	const {
		cachedVideos,
		isDownloading,
		downloadProgress,
		cacheSize,
		storageEstimate,
		deleteVideo,
		clearCache,
		cancelDownload,
	} = useOfflineStorage();

	const [showConfirmClear, setShowConfirmClear] = useState(false);

	const handleDeleteVideo = async (filePath: string) => {
		try {
			await deleteVideo(filePath);
		} catch (error) {
			console.error("Failed to delete video:", error);
			alert("動画の削除に失敗しました");
		}
	};

	const handleClearCache = async () => {
		try {
			await clearCache();
			setShowConfirmClear(false);
		} catch (error) {
			console.error("Failed to clear cache:", error);
			alert("キャッシュのクリアに失敗しました");
		}
	};

	const getStorageUsagePercentage = () => {
		if (!storageEstimate) return 0;
		return (storageEstimate.usage / storageEstimate.quota) * 100;
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
				{/* ヘッダー */}
				<div className="p-6 border-b border-slate-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-500/20 rounded-lg">
								<WifiOff className="h-6 w-6 text-blue-400" />
							</div>
							<div>
								<h2 className="text-xl font-bold text-white">
									オフライン動画管理
								</h2>
								<p className="text-slate-400 text-sm">
									ローカルに保存された動画を管理できます
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
						>
							<X className="h-5 w-5 text-slate-400" />
						</button>
					</div>
				</div>

				{/* ストレージ情報 */}
				<div className="p-6 border-b border-slate-700">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-slate-700/50 rounded-lg p-4">
							<div className="flex items-center gap-2 mb-2">
								<HardDrive className="h-4 w-4 text-blue-400" />
								<span className="text-sm text-slate-300">キャッシュサイズ</span>
							</div>
							<p className="text-lg font-semibold text-white">
								{formatFileSize(cacheSize)}
							</p>
						</div>

						<div className="bg-slate-700/50 rounded-lg p-4">
							<div className="flex items-center gap-2 mb-2">
								<Download className="h-4 w-4 text-green-400" />
								<span className="text-sm text-slate-300">保存済み動画</span>
							</div>
							<p className="text-lg font-semibold text-white">
								{cachedVideos.length}本
							</p>
						</div>

						{storageEstimate && (
							<div className="bg-slate-700/50 rounded-lg p-4">
								<div className="flex items-center gap-2 mb-2">
									<AlertCircle className="h-4 w-4 text-orange-400" />
									<span className="text-sm text-slate-300">
										ストレージ使用量
									</span>
								</div>
								<p className="text-lg font-semibold text-white">
									{getStorageUsagePercentage().toFixed(1)}%
								</p>
								<div className="w-full bg-slate-600 rounded-full h-2 mt-2">
									<div
										className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
										style={{
											width: `${Math.min(100, getStorageUsagePercentage())}%`,
										}}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 動画リスト */}
				<div className="flex-1 overflow-y-auto max-h-96">
					{cachedVideos.length === 0 ? (
						<div className="p-8 text-center">
							<WifiOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
							<p className="text-slate-400">オフライン動画がありません</p>
							<p className="text-slate-500 text-sm mt-2">
								動画プレイヤーからダウンロードしてください
							</p>
						</div>
					) : (
						<div className="p-4 space-y-2">
							{cachedVideos.map((video) => (
								<div
									key={video.id}
									className="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<h3 className="text-white font-medium truncate">
												{video.title}
											</h3>
											<div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
												<div className="flex items-center gap-1">
													<HardDrive className="h-3 w-3" />
													{formatFileSize(video.size)}
												</div>
												<div className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{new Date(video.downloadedAt).toLocaleDateString()}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => {
													// 動画プレイヤーで開く
													const encodedPath = encodeURIComponent(
														video.filePath,
													);
													window.open(`/play/${encodedPath}`, "_blank");
												}}
												className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
												title="再生"
											>
												<Play className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => handleDeleteVideo(video.filePath)}
												className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
												title="削除"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* ダウンロード中の動画 */}
				{Object.keys(isDownloading).length > 0 && (
					<div className="border-t border-slate-700 p-4">
						<h3 className="text-white font-semibold mb-3">ダウンロード中</h3>
						<div className="space-y-2">
							{Object.entries(isDownloading).map(([filePath, downloading]) => {
								if (!downloading) return null;
								const progress = downloadProgress[filePath];
								return (
									<div
										key={filePath}
										className="bg-slate-700/30 rounded-lg p-3"
									>
										<div className="flex items-center justify-between mb-2">
											<span className="text-white text-sm truncate flex-1">
												{filePath.split(/[/\\]/).pop()}
											</span>
											<button
												type="button"
												onClick={() => cancelDownload(filePath)}
												className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
												title="キャンセル"
											>
												<X className="h-3 w-3" />
											</button>
										</div>
										{progress && (
											<div>
												<div className="flex justify-between text-xs text-slate-400 mb-1">
													<span>{progress.percentage}%</span>
													<span>
														{formatFileSize(progress.loaded)} /{" "}
														{formatFileSize(progress.total)}
													</span>
												</div>
												<div className="w-full bg-slate-600 rounded-full h-2">
													<div
														className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
														style={{ width: `${progress.percentage}%` }}
													/>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* フッター */}
				<div className="p-6 border-t border-slate-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm text-slate-400">
							<Wifi className="h-4 w-4" />
							<span>
								オンライン時に動画をダウンロードしてオフラインで楽しめます
							</span>
						</div>
						{cachedVideos.length > 0 && (
							<button
								type="button"
								onClick={() => setShowConfirmClear(true)}
								className="px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
							>
								すべて削除
							</button>
						)}
					</div>
				</div>
			</div>

			{/* 削除確認ダイアログ */}
			{showConfirmClear && (
				<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
					<div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
						<h3 className="text-lg font-semibold text-white mb-2">
							すべてのキャッシュを削除
						</h3>
						<p className="text-slate-400 mb-4">
							すべてのオフライン動画を削除します。この操作は取り消せません。
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => setShowConfirmClear(false)}
								className="px-4 py-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
							>
								キャンセル
							</button>
							<button
								type="button"
								onClick={handleClearCache}
								className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
							>
								削除する
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
