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
	onError?: (error: string) => void;
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
	onError,
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
				crossOrigin="anonymous"
				className={cn(
					"w-full h-full object-contain min-h-[20vh] not-lg:max-h-[50vh]",
					isFullscreen && "flex-1",
				)}
				onClick={(e) => {
					if (singleTapTimeoutRef.current) {
						clearTimeout(singleTapTimeoutRef.current);
						singleTapTimeoutRef.current = null;
					}

					const isSingleTapCandidate = Date.now() - lastTapTime > 350;
					const handledByDoubleTap = onVideoTap(e);

					if (isSingleTapCandidate && !handledByDoubleTap) {
						if (isMobile) {
							singleTapTimeoutRef.current = setTimeout(() => {
								onSingleTap(); // これが、コントロールを表示する関数
								singleTapTimeoutRef.current = null;
							}, 350);
						} else {
							onSingleTap(); // これが、コントロールを表示する関数
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
				onError={(e) => {
					const video = e.currentTarget;
					let errorMessage = "動画の読み込みに失敗しました";

					if (video.error) {
						switch (video.error.code) {
							case video.error.MEDIA_ERR_ABORTED:
								errorMessage = "動画の読み込みが中断されました";
								break;
							case video.error.MEDIA_ERR_NETWORK:
								errorMessage = "ネットワークエラーが発生しました";
								break;
							case video.error.MEDIA_ERR_DECODE:
								errorMessage = "動画のデコードに失敗しました";
								break;
							case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
								errorMessage =
									"動画ファイルが見つからないか、対応していない形式です";
								break;
							default:
								errorMessage = `動画の読み込みエラー: ${video.error.message}`;
						}
					}

					// 404エラー（動画が存在しない）の場合はログを抑制
					const isNotFoundError =
						video.error?.code === video.error?.MEDIA_ERR_SRC_NOT_SUPPORTED;
					if (!isNotFoundError) {
						console.log("Video element error:", errorMessage, e);
					}
					onError?.(errorMessage);
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
							? "opacity-100"
							: "opacity-0 pointer-events-none",
					)}
					aria-label="動画を再生"
				>
					{isPlaying ? (
						<Pause className="h-8 w-8" fill="white" stroke="none" />
					) : (
						<Play className="h-8 w-8" fill="white" stroke="none" />
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
						"pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-full bg-primary/50 transition-all duration-150 ease-in-out",
						desktopFlashActive ? "opacity-100 scale-100" : "opacity-0 scale-75",
					)}
				>
					{desktopFlashIconState === "play" ? (
						<Play className="h-8 w-8" fill="white" stroke="none" />
					) : (
						<Pause className="h-8 w-8" fill="white" stroke="none" />
					)}
				</div>
			)}
		</>
	);
}
