"use client";

import type { VideoFileData } from "../../type";
import VideoCard from "../../components/VideoCard";
import { cn } from "../../libs/utils";

interface VideoGridProps {
	videos: VideoFileData[];
	className?: string;
	onShowStreamingWarning?: (video: VideoFileData) => void;
	onPlay?: (videoId: string) => void;
}

const VideoGrid = ({
	videos,
	className,
	onShowStreamingWarning,
	onPlay,
}: VideoGridProps) => {
	return (
		<div
			className={cn(
				"grid gap-6",
				// レスポンシブグリッド - モバイルファーストアプローチ
				"grid-cols-1", // モバイル: 1列
				"xs:grid-cols-2", // 小さなモバイル: 2列
				"sm:grid-cols-2", // タブレット縦: 2列
				"md:grid-cols-3", // タブレット横/小さなデスクトップ: 3列
				"lg:grid-cols-4", // デスクトップ: 4列
				"xl:grid-cols-5", // 大きなデスクトップ: 5列
				"2xl:grid-cols-6", // 超大きなデスクトップ: 6列
				className,
			)}
		>
			{videos.map((video, index) => (
				<VideoCard
					key={video.id}
					video={video}
					priority={index < 6} // 最初の6つの画像を優先読み込み
					onShowStreamingWarning={onShowStreamingWarning}
					onPlay={onPlay}
				/>
			))}
		</div>
	);
};

export default VideoGrid;
