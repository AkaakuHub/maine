"use client";

import { useState } from "react";
import Link from "next/link";
import {
	Play,
	Calendar,
	HardDrive,
	Clock,
	Info,
	MoreHorizontal,
} from "lucide-react";
import type { VideoFileData } from "@/type";
import { cn, formatFileSize, truncateText, formatDuration } from "@/libs/utils";

interface VideoListProps {
	videos: VideoFileData[];
	className?: string;
}

const VideoListItem = ({ video }: { video: VideoFileData }) => {
	const [showMenu, setShowMenu] = useState(false);

	return (
		<div className="group bg-slate-800/30 hover:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-purple-400/30 transition-all duration-300">
			<Link
				href={`/play/${encodeURIComponent(video.filePath)}`}
				className="block p-4"
			>
				<div className="flex items-center gap-4">
					{/* サムネイル */}
					<div className="relative w-28 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg overflow-hidden flex-shrink-0">
						<div className="w-full h-full flex items-center justify-center">
							<Play className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors" />
						</div>

						{/* 再生ボタンオーバーレイ */}
						<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<Play className="h-8 w-8 text-white" />
						</div>
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
							<div className="flex items-center gap-2">
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
									onClick={(e) => {
										e.preventDefault();
										setShowMenu(!showMenu);
									}}
								>
									<MoreHorizontal className="h-4 w-4" />
								</button>
							</div>
						</div>

						{/* 進行状況バー */}
						{video.lastWatched && (
							<div className="mt-3">
								<div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
										style={{ width: "35%" }} // TODO: 実際の進行状況を計算
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</Link>

			{/* コンテキストメニュー（TODO: 実装） */}
			{showMenu && (
				<div className="absolute right-4 top-16 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
					{/* メニューアイテムを実装 */}
				</div>
			)}
		</div>
	);
};

const VideoList = ({ videos, className }: VideoListProps) => {
	return (
		<div className={cn("space-y-3", className)}>
			{videos.map((video, index) => (
				<VideoListItem key={video.id} video={video} />
			))}
		</div>
	);
};

export default VideoList;
