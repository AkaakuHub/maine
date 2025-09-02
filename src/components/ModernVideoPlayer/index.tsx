"use client";

import { useRef, useState } from "react";
import { cn } from "@/libs/utils";

// 分離したコンポーネントとタイプのインポート
import VideoElement from "./VideoElement";
import SkipOverlay from "./SkipOverlay";
import ControlsOverlay from "./ControlsOverlay";
import SettingsMenu from "./SettingsMenu";
import VideoPlayerStyles from "./VideoPlayerStyles";
import type {
	HTMLVideoElementWithFullscreen,
	ModernVideoPlayerProps,
} from "./types";

// カスタムフック
import { useVideoPlayerSettings } from "./hooks/useVideoPlayerSettings";
import { useVideoElement } from "./hooks/useVideoElement";
import { useVideoFullscreen } from "./hooks/useVideoFullscreen";
import { useVideoSkip } from "./hooks/useVideoSkip";
import { useVideoControls } from "./hooks/useVideoControls";
import { useVideoScreenshot } from "./hooks/useVideoScreenshot";
import { useVideoInteraction } from "./hooks/useVideoInteraction";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMediaSession } from "./hooks/useMediaSession";

const ModernVideoPlayer = ({
	src,
	title,
	onTimeUpdate,
	initialTime = 0,
	className = "",
	onShowHelp,
}: ModernVideoPlayerProps) => {
	// Refs
	const videoRef = useRef<HTMLVideoElementWithFullscreen>(null);
	const containerRef = useRef<HTMLDivElement>(null);

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

	const {
		isPlaying,
		currentTime,
		duration,
		isBuffering,
		togglePlay,
		handleSeek,
		getSeekStep,
	} = useVideoElement({
		videoRef,
		initialTime,
		volume,
		playbackRate,
		isMuted,
		onTimeUpdate,
	});

	const { isFullscreen, toggleFullscreen } = useVideoFullscreen({
		containerRef,
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
		containerRef,
	});

	const { thumbnailUrl, takeScreenshot } = useVideoScreenshot({
		videoRef,
		autoDownloadScreenshot,
		title,
		currentTime,
	});

	const { lastTapTime, handleVideoTap, togglePictureInPicture } =
		useVideoInteraction({
			videoRef,
			skipForward,
			skipBackward,
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
		thumbnailUrl,
		duration,
		currentTime,
		playbackRate,
		videoRef,
		togglePlay,
		skipBackward,
		skipForward,
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

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative bg-overlay rounded-lg overflow-hidden group",
				isFullscreen &&
					"!fixed !inset-0 !w-screen !h-screen !rounded-none !z-50 flex flex-col",
				className,
			)}
			style={{
				cursor: showControls ? "default" : "none",
			}}
			onMouseMove={resetControlsTimeout}
			onMouseEnter={() => {
				// ウィンドウフォーカスに関係なくホバー時にコントロールを表示
				setShowControls(true);
				resetControlsTimeout();
			}}
			onMouseLeave={() => {
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
				lastTapTime={lastTapTime}
				onVideoTap={handleVideoTap}
				onTogglePlay={togglePlay}
			/>

			{/* スキップ予測オーバーレイ */}
			<SkipOverlay
				predictedTime={predictedTime}
				skipQueue={skipQueue}
				show={predictedTime !== null && skipQueue !== 0}
			/>

			{/* コントロール */}
			<ControlsOverlay
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
				getSeekStep={getSeekStep}
				onSeek={handleSeek}
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

			{/* カスタムスライダースタイル */}
			<VideoPlayerStyles />
		</div>
	);
};

export default ModernVideoPlayer;
