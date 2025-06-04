"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize,
	Minimize,
	SkipBack,
	SkipForward,
	Settings,
	PictureInPicture2,
	ArrowLeft,
	MoreHorizontal,
	RotateCcw,
	RotateCw,
	Clock,
	ChevronRight,
	ChevronLeft,
} from "lucide-react";
import { cn, formatDuration } from "@/libs/utils";

// フルスクリーン用の型定義
interface HTMLVideoElementWithFullscreen extends HTMLVideoElement {
	webkitRequestFullscreen?: () => Promise<void>;
	mozRequestFullScreen?: () => Promise<void>;
	msRequestFullscreen?: () => Promise<void>;
}

interface DocumentWithFullscreen extends Document {
	webkitFullscreenElement?: Element | null;
	mozFullScreenElement?: Element | null;
	msFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => Promise<void>;
	mozCancelFullScreen?: () => Promise<void>;
	msExitFullscreen?: () => Promise<void>;
}

interface ModernVideoPlayerProps {
	src: string;
	title?: string;
	onBack?: () => void;
	onTimeUpdate?: (currentTime: number, duration: number) => void;
	initialTime?: number;
	className?: string;
}

const ModernVideoPlayer = ({
	src,
	title,
	onBack,
	onTimeUpdate,
	initialTime = 0,
	className = "",
}: ModernVideoPlayerProps) => {
	const videoRef = useRef<HTMLVideoElementWithFullscreen>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const settingsRef = useRef<HTMLDivElement>(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [showSettings, setShowSettings] = useState(false);
	const [isBuffering, setIsBuffering] = useState(false);

	// スキップ機能
	const [skipSeconds, setSkipSeconds] = useState(10); // デフォルト10秒

	// 設定メニューの状態
	const [settingsView, setSettingsView] = useState<
		"main" | "playback" | "skip"
	>("main");

	const skipOptions = [5, 10, 20, 60, 90]; // 選択可能な秒数

	// 再生/一時停止
	const togglePlay = useCallback(() => {
		if (!videoRef.current) return;

		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	}, []);

	// 音量変更
	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = Number.parseFloat(e.target.value);
		setVolume(newVolume);
		if (videoRef.current) {
			videoRef.current.volume = newVolume;
			setIsMuted(newVolume === 0);
		}
	};

	// ミュート切り替え
	const toggleMute = useCallback(() => {
		if (!videoRef.current) return;

		if (isMuted) {
			videoRef.current.volume = volume;
			setIsMuted(false);
		} else {
			videoRef.current.volume = 0;
			setIsMuted(true);
		}
	}, [isMuted, volume]);

	// フルスクリーン切り替え - 新しいアプローチ
	const toggleFullscreen = useCallback(async () => {
		if (!containerRef.current) return;

		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
				setIsFullscreen(false);
			} else {
				// コンテナをフルスクリーンにして、CSSでレイアウトを制御
				await containerRef.current.requestFullscreen();
				setIsFullscreen(true);
			}
		} catch (error) {
			console.error("Fullscreen error:", error);
		}
	}, []);

	// シーク
	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!videoRef.current) return;
		const time = Number.parseFloat(e.target.value);
		videoRef.current.currentTime = time;
		setCurrentTime(time);
	};

	// 動画の長さに応じてシークバーのstep値を計算
	const getSeekStep = useCallback(() => {
		if (duration === 0) return 0.01;

		// シンプルな解決策: 常に小さなstepを使用
		// 動画の長さに応じて適切な刻みを設定
		if (duration <= 10) return 0.01; // 10秒以下: 0.01秒刻み
		if (duration <= 30) return 0.1; // 30秒以下: 0.1秒刻み
		if (duration <= 60) return 0.25; // 1分以下: 0.25秒刻み
		if (duration <= 300) return 0.5; // 5分以下: 0.5秒刻み
		if (duration <= 600) return 1; // 10分以下: 1秒刻み
		if (duration <= 1800) return 2; // 30分以下: 2秒刻み
		return 5; // 30分超: 5秒刻み
	}, [duration]);

	// 再生速度変更
	const handlePlaybackRateChange = (rate: number) => {
		if (!videoRef.current) return;
		videoRef.current.playbackRate = rate;
		setPlaybackRate(rate);
		setShowSettings(false);
	};

	// スキップ
	const skip = useCallback(
		(seconds: number) => {
			if (!videoRef.current) return;
			videoRef.current.currentTime = Math.max(
				0,
				Math.min(duration, currentTime + seconds),
			);
		},
		[duration, currentTime],
	);

	// カスタムスキップ関数
	const skipForward = useCallback(() => {
		skip(skipSeconds);
	}, [skip, skipSeconds]);

	const skipBackward = useCallback(() => {
		skip(-skipSeconds);
	}, [skip, skipSeconds]);

	// スキップ秒数設定
	const handleSkipSecondsChange = (seconds: number) => {
		setSkipSeconds(seconds);
	};

	// ダブルタップ機能
	const [lastTapTime, setLastTapTime] = useState(0);
	const [lastTapX, setLastTapX] = useState(0);

	const handleVideoTap = useCallback(
		(e: React.MouseEvent<HTMLVideoElement>) => {
			const currentTime = Date.now();
			const tapX = e.clientX;
			const videoWidth = e.currentTarget.clientWidth;
			const tapPosition = tapX / videoWidth; // 0-1の範囲

			// ダブルタップの判定（300ms以内、同じ位置付近）
			if (currentTime - lastTapTime < 300 && Math.abs(tapX - lastTapX) < 50) {
				e.stopPropagation(); // 通常の再生/一時停止を防ぐ

				if (tapPosition > 0.6) {
					// 右側タップ: 前進
					skipForward();
				} else if (tapPosition < 0.4) {
					// 左側タップ: 後退
					skipBackward();
				}

				// ダブルタップ処理後はlastTapTimeをリセット
				setLastTapTime(0);
			} else {
				setLastTapTime(currentTime);
				setLastTapX(tapX);
			}
		},
		[lastTapTime, lastTapX, skipForward, skipBackward],
	);

	// ピクチャーインピクチャー
	const togglePictureInPicture = async () => {
		if (!videoRef.current) return;

		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else {
				await videoRef.current.requestPictureInPicture();
			}
		} catch (error) {
			console.error("Picture-in-picture error:", error);
		}
	};

	// コントロール表示制御
	const resetControlsTimeout = useCallback(() => {
		if (controlsTimeoutRef.current) {
			clearTimeout(controlsTimeoutRef.current);
		}
		setShowControls(true);
		controlsTimeoutRef.current = setTimeout(() => {
			if (isPlaying) {
				setShowControls(false);
			}
		}, 3000);
	}, [isPlaying]);

	// 設定パネルの外側クリック検知
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				settingsRef.current &&
				!settingsRef.current.contains(event.target as Node)
			) {
				setShowSettings(false);
				setSettingsView("main"); // メインビューに戻す
			}
		};

		if (showSettings) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showSettings]);

	// キーボードショートカット
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement) return;

			switch (e.code) {
				case "Space":
					e.preventDefault();
					togglePlay();
					break;
				case "ArrowLeft":
					e.preventDefault();
					skipBackward();
					break;
				case "ArrowRight":
					e.preventDefault();
					skipForward();
					break;
				case "ArrowUp":
					e.preventDefault();
					setVolume((prev) => Math.min(1, prev + 0.1));
					break;
				case "ArrowDown":
					e.preventDefault();
					setVolume((prev) => Math.max(0, prev - 0.1));
					break;
				case "KeyF":
					e.preventDefault();
					toggleFullscreen();
					break;
				case "KeyM":
					e.preventDefault();
					toggleMute();
					break;
				case "Escape":
					e.preventDefault();
					if (settingsView !== "main") {
						setSettingsView("main"); // サブメニューの場合はメインに戻る
					} else {
						setShowSettings(false); // メインメニューの場合は閉じる
					}
					break;
			}
		};

		document.addEventListener("keydown", handleKeyPress);
		return () => document.removeEventListener("keydown", handleKeyPress);
	}, [
		togglePlay,
		skipBackward,
		skipForward,
		toggleFullscreen,
		toggleMute,
		settingsView,
	]);

	// マウス移動でコントロール表示
	useEffect(() => {
		resetControlsTimeout();
	}, [resetControlsTimeout]);

	// ビデオイベントリスナーの設定
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleTimeUpdate = () => {
			const current = video.currentTime;
			setCurrentTime(current);

			// 現在位置が最後まで到達したら自動的に一時停止
			if (current >= video.duration) {
				setIsPlaying(false);
				video.pause();
			}

			// 親コンポーネントに時間更新を通知
			if (onTimeUpdate && video.duration) {
				onTimeUpdate(current, video.duration);
			}
		};

		const handleLoadedMetadata = () => {
			setDuration(video.duration);

			// 初期時間が設定されている場合は、その位置にシーク
			if (initialTime > 0 && initialTime < video.duration) {
				video.currentTime = initialTime;
			}
		};

		const handleWaiting = () => setIsBuffering(true);
		const handleCanPlay = () => setIsBuffering(false);

		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		video.addEventListener("waiting", handleWaiting);
		video.addEventListener("canplay", handleCanPlay);

		return () => {
			video.removeEventListener("timeupdate", handleTimeUpdate);
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			video.removeEventListener("waiting", handleWaiting);
			video.removeEventListener("canplay", handleCanPlay);
		};
	}, [onTimeUpdate, initialTime]);

	// フルスクリーン状態の変更を監視
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () =>
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative bg-black rounded-lg overflow-hidden group",
				isFullscreen &&
					"!fixed !inset-0 !w-screen !h-screen !rounded-none !z-50 flex flex-col",
				className,
			)}
			onMouseMove={resetControlsTimeout}
			onMouseLeave={() => isPlaying && setShowControls(false)}
		>
			{/* ビデオ要素 */}
			<video
				ref={videoRef}
				src={src}
				className={cn("w-full h-full object-contain", isFullscreen && "flex-1")}
				onClick={(e) => {
					handleVideoTap(e);
					// シングルタップの場合は通常の再生/一時停止
					if (Date.now() - lastTapTime > 300) {
						togglePlay();
					}
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						togglePlay();
					}
				}}
				preload="metadata"
				tabIndex={0}
				aria-label={`動画: ${title || "無題"}`}
			>
				<track kind="captions" srcLang="ja" label="日本語字幕" />
			</video>

			{/* バッファリング表示 */}
			{isBuffering && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/20">
					<div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
				</div>
			)}

			{/* 再生ボタンオーバーレイ */}
			<button
				className={cn(
					"absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity border-0 w-full h-full",
					!isPlaying && !isBuffering
						? "opacity-100"
						: "opacity-0 pointer-events-none",
				)}
				onClick={togglePlay}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						togglePlay();
					}
				}}
				aria-label="動画を再生"
				type="button"
			>
				<div className="bg-white/20 backdrop-blur-sm rounded-full p-6 hover:bg-white/30 transition-colors">
					<Play className="h-16 w-16 text-white ml-2" />
				</div>
			</button>

			{/* コントロール */}
			<div
				className={cn(
					"absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 p-4",
					showControls ? "opacity-100" : "opacity-0",
				)}
			>
				{/* 上部: 戻るボタンのみ */}
				{/* <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 backdrop-blur-sm rounded-full hover:from-purple-500/70 hover:to-blue-500/70 transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5 text-white" />
          </button>
        </div> */}

				{/* プログレスバー */}
				<div className="mb-3">
					<input
						type="range"
						min={0}
						max={duration || 0}
						step={getSeekStep()}
						value={currentTime}
						onChange={handleSeek}
						className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider progress-slider"
					/>
				</div>

				{/* 下部コントロール */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={togglePlay}
							className="text-white hover:text-purple-300 transition-colors"
						>
							{isPlaying ? (
								<Pause className="h-6 w-6" />
							) : (
								<Play className="h-6 w-6" />
							)}
						</button>

						{/* カスタムスキップボタン */}
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={skipBackward}
								className="text-white hover:text-blue-300 transition-colors flex items-center gap-1"
								title={`${skipSeconds}秒戻す`}
							>
								<RotateCcw className="h-4 w-4" />
								<span className="text-xs w-6">{skipSeconds}s</span>
							</button>

							<button
								type="button"
								onClick={skipForward}
								className="text-white hover:text-blue-300 transition-colors flex items-center gap-1"
								title={`${skipSeconds}秒進む`}
							>
								<RotateCw className="h-4 w-4" />
								<span className="text-xs w-6">{skipSeconds}s</span>
							</button>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={toggleMute}
								className="text-white hover:text-cyan-300 transition-colors"
							>
								{isMuted ? (
									<VolumeX className="h-5 w-5" />
								) : (
									<Volume2 className="h-5 w-5" />
								)}
							</button>
							<input
								type="range"
								min="0"
								max="1"
								step="0.1"
								value={isMuted ? 0 : volume}
								onChange={handleVolumeChange}
								className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider volume-slider"
							/>
						</div>

						<span className="text-white text-sm font-mono">
							{formatDuration(currentTime)} / {formatDuration(duration)}
						</span>
					</div>

					<div className="flex items-center gap-3">
						{/* 設定メニュー */}
						<div className="relative">
							<button
								type="button"
								onClick={() => {
									setShowSettings(!showSettings);
									if (!showSettings) {
										setSettingsView("main"); // 設定を開くときはメインビューに
									}
								}}
								className="text-white hover:text-yellow-300 transition-colors"
							>
								<Settings className="h-5 w-5" />
							</button>
							{showSettings && (
								<div
									ref={settingsRef}
									className="absolute bottom-8 right-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 backdrop-blur-sm rounded-lg p-3 min-w-48 shadow-xl"
								>
									{settingsView === "main" && (
										<div>
											<div className="text-white text-sm mb-3 font-semibold flex items-center gap-2">
												<Settings className="h-4 w-4" />
												設定
											</div>

											{/* メインメニュー */}
											<button
												type="button"
												onClick={() => setSettingsView("skip")}
												className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-orange-500/20 hover:text-orange-300 rounded transition-colors mb-2"
											>
												<div className="flex items-center gap-2 w-30">
													<Clock className="h-4 w-4" />
													スキップ秒数
												</div>
												<div className="flex items-center gap-1">
													<span className="text-xs text-orange-400 w-8">
														{skipSeconds}秒
													</span>
													<ChevronRight className="h-4 w-4" />
												</div>
											</button>

											<button
												type="button"
												onClick={() => setSettingsView("playback")}
												className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-purple-500/20 hover:text-purple-300 rounded transition-colors"
											>
												<div className="flex items-center gap-2 w-30">
													<Play className="h-4 w-4" />
													再生速度
												</div>
												<div className="flex items-center gap-1">
													<span className="text-xs text-purple-400 w-8">
														{playbackRate}x
													</span>
													<ChevronRight className="h-4 w-4" />
												</div>
											</button>
										</div>
									)}

									{settingsView === "skip" && (
										<div>
											<div className="flex items-center gap-2 mb-3">
												<button
													type="button"
													onClick={() => setSettingsView("main")}
													className="text-slate-400 hover:text-white transition-colors"
												>
													<ChevronLeft className="h-4 w-4" />
												</button>
												<div className="text-orange-300 text-sm font-semibold flex items-center gap-2">
													<Clock className="h-4 w-4" />
													スキップ秒数
												</div>
											</div>

											{skipOptions.map((seconds) => (
												<button
													key={seconds}
													type="button"
													onClick={() => {
														handleSkipSecondsChange(seconds);
														setSettingsView("main");
													}}
													className={cn(
														"block w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1",
														skipSeconds === seconds
															? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
															: "text-slate-300 hover:bg-orange-500/20",
													)}
												>
													{seconds}秒
												</button>
											))}
										</div>
									)}

									{settingsView === "playback" && (
										<div>
											<div className="flex items-center gap-2 mb-3">
												<button
													type="button"
													onClick={() => setSettingsView("main")}
													className="text-slate-400 hover:text-white transition-colors"
												>
													<ChevronLeft className="h-4 w-4" />
												</button>
												<div className="text-purple-300 text-sm font-semibold flex items-center gap-2">
													<Play className="h-4 w-4" />
													再生速度
												</div>
											</div>

											{[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
												<button
													key={rate}
													type="button"
													onClick={() => {
														handlePlaybackRateChange(rate);
														setSettingsView("main");
													}}
													className={cn(
														"block w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1",
														playbackRate === rate
															? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
															: "text-slate-300 hover:bg-purple-500/20",
													)}
												>
													{rate}x
												</button>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={togglePictureInPicture}
							className="text-white hover:text-green-300 transition-colors"
						>
							<PictureInPicture2 className="h-5 w-5" />
						</button>

						<button
							type="button"
							onClick={toggleFullscreen}
							className="text-white hover:text-pink-300 transition-colors"
						>
							{isFullscreen ? (
								<Minimize className="h-5 w-5" />
							) : (
								<Maximize className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* カスタムスライダースタイル */}
			<style jsx>{`
        /* フルスクリーン時のスタイル */
        .group:fullscreen {
          display: flex;
          flex-direction: column;
          width: 100vw !important;
          height: 100vh !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
        }
        
        .group:fullscreen video {
          flex: 1;
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
        }
        
        .progress-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #3b82f6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        }
        .progress-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #3b82f6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        }
        .volume-slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: linear-gradient(45deg, #06b6d4, #10b981);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.4);
        }
        .volume-slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: linear-gradient(45deg, #06b6d4, #10b981);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.4);
        }
      `}</style>
		</div>
	);
};

export default ModernVideoPlayer;
