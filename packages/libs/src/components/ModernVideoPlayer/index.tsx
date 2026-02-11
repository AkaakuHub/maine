"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../libs/utils";

import ControlsOverlay from "./ControlsOverlay";
import SettingsMenu from "./SettingsMenu";
import SkipOverlay from "./SkipOverlay";
// 分離したコンポーネントとタイプのインポート
import VideoElement from "./VideoElement";
import type {
	HTMLVideoElementWithFullscreen,
	ModernVideoPlayerProps,
} from "./types";

import { useIsMobile } from "../../hooks/useIsMobile";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMediaSession } from "./hooks/useMediaSession";
import { useVideoChapters } from "./hooks/useVideoChapters";
import { useVideoControls } from "./hooks/useVideoControls";
import { useVideoElement } from "./hooks/useVideoElement";
import { useVideoFullscreen } from "./hooks/useVideoFullscreen";
import { useVideoInteraction } from "./hooks/useVideoInteraction";
// カスタムフック
import { useVideoPlayerSettings } from "./hooks/useVideoPlayerSettings";
import { useVideoScreenshot } from "./hooks/useVideoScreenshot";
import { useVideoSkip } from "./hooks/useVideoSkip";
import { usePlaylistNavigation } from "./hooks/usePlaylistNavigation";

const ModernVideoPlayer = ({
	src,
	title,
	thumbnailPath,
	onTimeUpdate,
	initialTime = 0,
	className = "",
	onShowHelp,
	onError,
	onVideoEnd,
	playlistVideos = [],
	onVideoSelect,
	id,
}: ModernVideoPlayerProps) => {
	// Refs
	const videoRef = useRef<HTMLVideoElementWithFullscreen>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();

	// カスタムフックの呼び出し
	const settings = useVideoPlayerSettings();
	const {
		volume,
		playbackRate,
		skipSeconds,
		isShowRestTime,
		autoDownloadScreenshot,
		setVolume,
		setPlaybackRate,
		setSkipSeconds,
		setIsShowRestTime,
		setAutoDownloadScreenshot,
	} = settings;

	const [isMuted, setIsMuted] = useState(false);
	const desktopFlashCounterRef = useRef(0);
	const prevIsPlayingRef = useRef<boolean | null>(null);
	const [desktopFlashIndicator, setDesktopFlashIndicator] = useState<{
		key: number;
		icon: "play" | "pause";
	} | null>(null);

	const { isFullscreen, toggleFullscreen } = useVideoFullscreen({
		containerRef,
		videoRef,
	});

	// 現在の動画IDを取得
	const currentId = id || "";

	// プレイストナビゲーションフック
	const { playNextVideo, hasNextVideo } = usePlaylistNavigation({
		playlistVideos,
		currentId,
		onVideoSelect,
	});

	// 動画終了時のハンドラー
	const handleVideoEnd = useCallback(() => {
		// プレイリストがあれば次の動画を自動再生
		if (hasNextVideo && playNextVideo()) {
			return;
		}
		// 次の動画がない場合は元のハンドラーを呼び出す
		if (onVideoEnd) {
			onVideoEnd();
		}
	}, [hasNextVideo, playNextVideo, onVideoEnd]);

	const {
		isPlaying,
		currentTime,
		duration,
		isBuffering,
		isSeeking,
		togglePlay,
		handleSeek,
		handleSeekStart,
		handleSeekEnd,
		getSeekStep,
	} = useVideoElement({
		videoRef,
		initialTime,
		volume,
		playbackRate,
		isMuted,
		onTimeUpdate,
		onVideoEnd: handleVideoEnd,
	});

	const { predictedTime, skipQueue, skipForward, skipBackward } = useVideoSkip({
		videoRef,
		skipSeconds,
		duration,
	});

	const {
		showControls,
		showSettings,
		settingsView,
		settingsRef,
		settingsButtonRef,
		setShowControls,
		setShowSettings,
		setSettingsView,
		resetControlsTimeout,
	} = useVideoControls({
		isPlaying,
	});

	const { takeScreenshot } = useVideoScreenshot({
		videoRef,
		autoDownloadScreenshot,
		title,
		currentTime,
	});

	const { handleVideoTap, togglePictureInPicture } = useVideoInteraction({
		videoRef,
		skipForward,
		skipBackward,
		enableDoubleTap: isMobile,
		onControlToggle: setShowControls,
	});

	const {
		chapters,
		seekToTime,
		skippedChapter,
		clearSkippedChapter: _clearSkippedChapter,
	} = useVideoChapters({
		src,
		videoRef,
	});

	// 音量変更ハンドラー（元のコードと同じ動作に復元）
	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = Number.parseFloat(e.target.value);
		setVolume(newVolume);
		if (videoRef.current) {
			videoRef.current.volume = newVolume;
			setIsMuted(newVolume === 0);
		}
	};

	// キーボードから音量変更する関数
	const handleVolumeKeyboard = (newVolume: number) => {
		setVolume(newVolume);
		if (videoRef.current) {
			videoRef.current.volume = newVolume;
			setIsMuted(newVolume === 0);
		}
	};

	// ミュート切り替え（元のコードと同じ動作に復元）
	const toggleMute = () => {
		if (!videoRef.current) return;

		if (isMuted) {
			videoRef.current.volume = volume;
			setIsMuted(false);
		} else {
			videoRef.current.volume = 0;
			setIsMuted(true);
		}
	};

	// キーボードショートカット
	useKeyboardShortcuts({
		togglePlay,
		skipBackward,
		skipForward,
		handleVolumeKeyboard,
		currentVolume: volume,
		toggleFullscreen,
		toggleMute,
		takeScreenshot,
		onShowHelp,
		settingsView,
		isFullscreen,
		setSettingsView,
		setShowSettings,
	});

	// Media Session API
	useMediaSession({
		title,
		src,
		thumbnailPath,
		duration,
		currentTime,
		playbackRate,
		videoRef,
		togglePlay,
		skipBackward,
		skipForward,
		isPlaying,
	});

	// ハンドラー関数（設定用）
	const handlePlaybackRateChange = (rate: number) => {
		if (!videoRef.current) return;
		videoRef.current.playbackRate = rate;
		setPlaybackRate(rate);
		setShowSettings(false);
	};

	const handleSkipSecondsChange = (seconds: number) => {
		setSkipSeconds(seconds);
		setShowSettings(false);
	};

	const handleScreenshotSettingChange = (enabled: boolean) => {
		setAutoDownloadScreenshot(enabled);
		setShowSettings(false);
	};

	const skipOptions = [5, 10, 20, 60, 90];

	const triggerDesktopFlash = useCallback((nextPlaying: boolean) => {
		desktopFlashCounterRef.current += 1;
		setDesktopFlashIndicator({
			key: desktopFlashCounterRef.current,
			icon: nextPlaying ? "play" : "pause",
		});
	}, []);

	useEffect(() => {
		if (isMobile) {
			prevIsPlayingRef.current = isPlaying;
			return;
		}

		if (prevIsPlayingRef.current === null) {
			prevIsPlayingRef.current = isPlaying;
			return;
		}

		if (prevIsPlayingRef.current !== isPlaying) {
			triggerDesktopFlash(isPlaying);
		}

		prevIsPlayingRef.current = isPlaying;
	}, [isMobile, isPlaying, triggerDesktopFlash]);

	const handleSingleTap = useCallback(() => {
		if (isMobile) {
			if (showControls) {
				setShowControls(false);
				setShowSettings(false);
				setSettingsView("main");
			} else {
				setShowControls(true);
				resetControlsTimeout();
				setShowSettings(false);
				setSettingsView("main");
			}
		} else {
			togglePlay();
			setShowControls(true);
			resetControlsTimeout();
		}
	}, [
		isMobile,
		resetControlsTimeout,
		setShowControls,
		setShowSettings,
		setSettingsView,
		showControls,
		togglePlay,
	]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"flex items-center justify-center relative bg-overlay overflow-hidden group",
				isFullscreen &&
					"!fixed !inset-0 !w-screen !h-screen !rounded-none !z-50 flex flex-col",
				className,
			)}
			style={{
				cursor: !isMobile && !showControls ? "none" : "default",
			}}
			onMouseMove={() => {
				if (isMobile) return;
				resetControlsTimeout();
			}}
			onMouseEnter={() => {
				if (isMobile) return;
				resetControlsTimeout();
			}}
			onMouseLeave={() => {
				if (isMobile) return;
				// マウスが離れたらコントロールを非表示（再生中の場合のみ）
				if (isPlaying) {
					setShowControls(false);
				}
			}}
		>
			{/* ビデオ要素 */}
			<VideoElement
				src={src}
				title={title}
				videoRef={videoRef}
				isFullscreen={isFullscreen}
				isPlaying={isPlaying}
				isBuffering={isBuffering}
				onVideoTap={handleVideoTap}
				onSingleTap={handleSingleTap}
				onTogglePlay={togglePlay}
				isMobile={isMobile}
				showMobileControls={isMobile && showControls}
				desktopFlashKey={desktopFlashIndicator?.key ?? null}
				desktopFlashIcon={desktopFlashIndicator?.icon ?? null}
				onError={onError}
			/>

			{/* スキップ予測オーバーレイ */}
			<SkipOverlay
				predictedTime={predictedTime}
				skipQueue={skipQueue}
				show={predictedTime !== null && skipQueue !== 0}
			/>

			{/* チャプタースキップ通知 */}
			{skippedChapter && (
				<div className="absolute top-4 left-1/2 text-center transform -translate-x-1/2 bg-warning/90 text-text-inverse px-4 py-2 rounded-lg shadow-lg z-40 animate-fade-in">
					<div className="text-xs font-semibold">
						チャプターをスキップしました
					</div>
					<div className="text-xs opacity-90">{skippedChapter.title}</div>
				</div>
			)}

			{/* コントロール */}
			<ControlsOverlay
				variant={isMobile ? "mobile" : "desktop"}
				show={showControls}
				duration={duration}
				currentTime={currentTime}
				predictedTime={predictedTime}
				isPlaying={isPlaying}
				skipSeconds={skipSeconds}
				isMuted={isMuted}
				volume={volume}
				isShowRestTime={isShowRestTime}
				isFullscreen={isFullscreen}
				showSettings={showSettings}
				settingsButtonRef={settingsButtonRef}
				chapters={chapters}
				getSeekStep={getSeekStep}
				onSeek={handleSeek}
				onSeekStart={handleSeekStart}
				onSeekEnd={handleSeekEnd}
				isSeeking={isSeeking}
				onSeekToTime={seekToTime}
				onTogglePlay={togglePlay}
				onSkipBackward={skipBackward}
				onSkipForward={skipForward}
				onToggleMute={toggleMute}
				onVolumeChange={handleVolumeChange}
				onSetIsShowRestTime={(fn) => setIsShowRestTime(fn(isShowRestTime))}
				onSetShowSettings={setShowSettings}
				onSetSettingsView={setSettingsView}
				onTakeScreenshot={takeScreenshot}
				onTogglePictureInPicture={togglePictureInPicture}
				onToggleFullscreen={toggleFullscreen}
			/>

			{/* 設定メニュー */}
			<SettingsMenu
				show={showSettings}
				settingsView={settingsView}
				setSettingsView={setSettingsView}
				skipSeconds={skipSeconds}
				skipOptions={skipOptions}
				playbackRate={playbackRate}
				autoDownloadScreenshot={autoDownloadScreenshot}
				onSkipSecondsChange={handleSkipSecondsChange}
				onPlaybackRateChange={handlePlaybackRateChange}
				onScreenshotSettingChange={handleScreenshotSettingChange}
				settingsRef={settingsRef}
			/>
		</div>
	);
};

export default ModernVideoPlayer;
