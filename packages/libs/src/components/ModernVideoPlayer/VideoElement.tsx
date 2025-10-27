import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "../../libs/utils";
import type { HTMLVideoElementWithFullscreen } from "./types";

interface VideoElementProps {
	src: string;
	title?: string;
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	isFullscreen: boolean;
	isPlaying: boolean;
	isBuffering: boolean;
	lastTapTime: number;
	onVideoTap: (e: React.MouseEvent<HTMLVideoElement>) => boolean;
	onSingleTap: () => void;
	onTogglePlay: () => void;
	isMobile: boolean;
	showMobileControls: boolean;
	desktopFlashKey: number | null;
	desktopFlashIcon: "play" | "pause" | null;
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
	onSingleTap,
	onTogglePlay,
	isMobile,
	showMobileControls,
	desktopFlashKey,
	desktopFlashIcon,
}: VideoElementProps) {
	const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const desktopFlashDeactivateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const desktopFlashHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [desktopFlashVisible, setDesktopFlashVisible] = useState(false);
	const [desktopFlashActive, setDesktopFlashActive] = useState(false);
	const [desktopFlashIconState, setDesktopFlashIconState] = useState<
		"play" | "pause"
	>("play");

	useEffect(() => {
		return () => {
			if (singleTapTimeoutRef.current) {
				clearTimeout(singleTapTimeoutRef.current);
				singleTapTimeoutRef.current = null;
			}
			if (desktopFlashDeactivateTimeoutRef.current) {
				clearTimeout(desktopFlashDeactivateTimeoutRef.current);
				desktopFlashDeactivateTimeoutRef.current = null;
			}
			if (desktopFlashHideTimeoutRef.current) {
				clearTimeout(desktopFlashHideTimeoutRef.current);
				desktopFlashHideTimeoutRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (isMobile) return;
		if (desktopFlashKey === null || !desktopFlashIcon) return;
		setDesktopFlashIconState(desktopFlashIcon);
		setDesktopFlashVisible(true);
		setDesktopFlashActive(true);
		if (desktopFlashDeactivateTimeoutRef.current) {
			clearTimeout(desktopFlashDeactivateTimeoutRef.current);
		}
		if (desktopFlashHideTimeoutRef.current) {
			clearTimeout(desktopFlashHideTimeoutRef.current);
		}
		desktopFlashDeactivateTimeoutRef.current = setTimeout(() => {
			setDesktopFlashActive(false);
		}, 200);
		desktopFlashHideTimeoutRef.current = setTimeout(() => {
			setDesktopFlashVisible(false);
		}, 320);
	}, [desktopFlashKey, desktopFlashIcon, isMobile]);

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
					if (singleTapTimeoutRef.current) {
						clearTimeout(singleTapTimeoutRef.current);
						singleTapTimeoutRef.current = null;
					}

					const isSingleTapCandidate = Date.now() - lastTapTime > 300;
					const handledByDoubleTap = onVideoTap(e);

					if (isSingleTapCandidate && !handledByDoubleTap) {
						if (isMobile) {
							singleTapTimeoutRef.current = setTimeout(() => {
								onSingleTap();
								singleTapTimeoutRef.current = null;
							}, 180);
						} else {
							onSingleTap();
						}
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
			{isMobile ? (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onTogglePlay();
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onTogglePlay();
						}
					}}
					className={cn(
						"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/50 transition-opacity duration-200",
						showMobileControls
							? "opacity-100 pointer-events-auto"
							: "opacity-0 pointer-events-none",
					)}
					aria-label="動画を再生"
				>
					{isPlaying ? (
						<Pause className="h-8 w-8" fill="currentColor" />
					) : (
						<Play className="h-8 w-8" fill="currentColor" />
					)}
				</button>
			) : (
				<button
					className={cn(
						"absolute inset-0 flex items-center justify-center transition-opacity border-0 w-full h-full",
						!isPlaying && !isBuffering
							? "opacity-100"
							: "opacity-0 pointer-events-none",
					)}
					onClick={(event) => {
						event.stopPropagation();
						onTogglePlay();
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onTogglePlay();
						}
					}}
					aria-label="動画を再生"
					type="button"
				/>
			)}

			{!isMobile && desktopFlashVisible && (
				<div
					className={cn(
						"pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/50 text-text transition-all duration-150 ease-in-out",
						desktopFlashActive ? "opacity-100 scale-100" : "opacity-0 scale-75",
					)}
				>
					{desktopFlashIconState === "play" ? (
						<Play className="h-8 w-8" fill="currentColor" />
					) : (
						<Pause className="h-8 w-8" fill="currentColor" />
					)}
				</div>
			)}
		</>
	);
}
