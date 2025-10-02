import { Play } from "lucide-react";
import { cn } from "@/libs/utils";
import type { HTMLVideoElementWithFullscreen } from "./types";

interface VideoElementProps {
	src: string;
	title?: string;
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	isFullscreen: boolean;
	isPlaying: boolean;
	isBuffering: boolean;
	lastTapTime: number;
	onVideoTap: (e: React.MouseEvent<HTMLVideoElement>) => void;
	onTogglePlay: () => void;
}

export default function VideoElement({
	src,
	title,
	videoRef,
	isFullscreen,
	isPlaying,
	isBuffering,
	lastTapTime,
	onVideoTap,
	onTogglePlay,
}: VideoElementProps) {
	return (
		<>
			{/* ビデオ要素 */}
			<video
				ref={videoRef}
				src={src}
				className={cn(
					"w-full h-full object-contain min-h-[300px]",
					isFullscreen && "flex-1",
				)}
				onClick={(e) => {
					onVideoTap(e);
					// シングルタップの場合は通常の再生/一時停止
					if (Date.now() - lastTapTime > 300) {
						onTogglePlay();
					}
					// クリック後もキーボードショートカットが効くようにフォーカスを維持
					e.currentTarget.blur();
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onTogglePlay();
					}
				}}
				preload="metadata"
				autoPlay
				playsInline
				tabIndex={0}
				aria-label={`動画: ${title || src.split("/").pop()?.split(".")[0] || "無題の動画"}`}
				data-title={
					title || src.split("/").pop()?.split(".")[0] || "無題の動画"
				}
				x-webkit-airplay="allow"
				webkit-playsinline="true"
			>
				<track kind="captions" srcLang="ja" label="日本語字幕" />
			</video>

			{/* バッファリング表示 */}
			{isBuffering && (
				<div className="absolute inset-0 flex items-center justify-center bg-overlay">
					<div className="w-12 h-12 border-4 border-surface/30 border-t-surface rounded-full animate-spin" />
				</div>
			)}

			{/* 再生ボタンオーバーレイ */}
			<button
				className={cn(
					"absolute inset-0 flex items-center justify-center transition-opacity border-0 w-full h-full",
					!isPlaying && !isBuffering
						? "opacity-100"
						: "opacity-0 pointer-events-none",
				)}
				onClick={onTogglePlay}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onTogglePlay();
					}
				}}
				aria-label="動画を再生"
				type="button"
			>
				<div className="bg-surface-hover/40 backdrop-blur-sm rounded-full p-6 hover:bg-surface-hover/60 transition-colors flex items-center justify-center">
					<Play className="h-16 w-16 text-text" />
				</div>
			</button>
		</>
	);
}
