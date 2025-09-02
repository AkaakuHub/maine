import {
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize,
	Minimize,
	RotateCcw,
	RotateCw,
	Settings,
	PictureInPicture2,
	Camera,
} from "lucide-react";
import { cn, formatDuration } from "@/libs/utils";
import type { SettingsView } from "./types";

interface ControlsOverlayProps {
	show: boolean;
	duration: number;
	currentTime: number;
	predictedTime: number | null;
	isPlaying: boolean;
	skipSeconds: number;
	isMuted: boolean;
	volume: number;
	isShowRestTime: boolean;
	isFullscreen: boolean;
	showSettings: boolean;
	settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
	getSeekStep: () => number;
	onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onTogglePlay: () => void;
	onSkipBackward: () => void;
	onSkipForward: () => void;
	onToggleMute: () => void;
	onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onSetIsShowRestTime: (fn: (c: boolean) => boolean) => void;
	onSetShowSettings: (show: boolean) => void;
	onSetSettingsView: (view: SettingsView) => void;
	onTakeScreenshot: () => void;
	onTogglePictureInPicture: () => void;
	onToggleFullscreen: () => void;
}

export default function ControlsOverlay({
	show,
	duration,
	currentTime,
	predictedTime,
	isPlaying,
	skipSeconds,
	isMuted,
	volume,
	isShowRestTime,
	isFullscreen,
	showSettings,
	settingsButtonRef,
	getSeekStep,
	onSeek,
	onTogglePlay,
	onSkipBackward,
	onSkipForward,
	onToggleMute,
	onVolumeChange,
	onSetIsShowRestTime,
	onSetShowSettings,
	onSetSettingsView,
	onTakeScreenshot,
	onTogglePictureInPicture,
	onToggleFullscreen,
}: ControlsOverlayProps) {
	return (
		<div
			className={cn(
				"absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 p-4",
				show ? "opacity-100" : "opacity-0",
			)}
		>
			{/* プログレスバー */}
			<div className="mb-3">
				<input
					type="range"
					min={0}
					max={duration || 0}
					step={getSeekStep()}
					value={currentTime}
					onChange={onSeek}
					className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer slider progress-slider"
				/>
			</div>

			{/* 下部コントロール */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onTogglePlay}
						className="text-text hover:text-primary transition-colors"
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
							onClick={onSkipBackward}
							className="text-text hover:text-primary transition-colors flex items-center gap-1"
							title={`${skipSeconds}秒戻す`}
						>
							<RotateCcw className="h-4 w-4" />
							<span className="text-xs w-6">{skipSeconds}s</span>
						</button>

						<button
							type="button"
							onClick={onSkipForward}
							className="text-text hover:text-primary transition-colors flex items-center gap-1"
							title={`${skipSeconds}秒進む`}
						>
							<RotateCw className="h-4 w-4" />
							<span className="text-xs w-6">{skipSeconds}s</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onToggleMute}
							className="text-text hover:text-primary transition-colors"
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
							onChange={onVolumeChange}
							className="w-16 h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer slider volume-slider"
						/>
					</div>
					<span className="text-text text-sm font-mono flex gap-1">
						<button
							type="button"
							onClick={() => {
								onSetIsShowRestTime((c) => {
									const newValue = !c;
									// LocalStorageに保存
									localStorage.setItem(
										"video-player-show-rest-time",
										newValue.toString(),
									);
									return newValue;
								});
							}}
							className="cursor-pointer hover:text-primary transition-colors"
						>
							{isShowRestTime ? (
								<>
									<span>-</span>
									<span
										className={predictedTime !== null ? "text-primary" : ""}
									>
										{formatDuration(duration - (predictedTime ?? currentTime))}
									</span>
								</>
							) : (
								<>
									<span
										className={predictedTime !== null ? "text-primary" : ""}
									>
										{formatDuration(predictedTime ?? currentTime)}
									</span>
									<span>/</span>
									<span>{formatDuration(duration)}</span>
								</>
							)}
						</button>
					</span>
				</div>

				<div className="flex items-center gap-3">
					{/* 設定メニュー */}
					<div className="relative">
						<button
							ref={settingsButtonRef}
							type="button"
							onClick={() => {
								if (showSettings) {
									onSetShowSettings(false);
									onSetSettingsView("main"); // 閉じるときもメインビューにリセット
								} else {
									onSetShowSettings(true);
									onSetSettingsView("main"); // 設定を開くときはメインビューに
								}
							}}
							className="text-text hover:text-primary transition-colors relative top-[2.5px]"
						>
							<Settings className="h-5 w-5" />
						</button>
					</div>
					<button
						type="button"
						onClick={onTakeScreenshot}
						className="text-text hover:text-primary transition-colors"
						title="スクリーンショットを撮る"
					>
						<Camera className="h-5 w-5" />
					</button>
					<button
						type="button"
						onClick={onTogglePictureInPicture}
						className="text-text hover:text-primary transition-colors"
					>
						<PictureInPicture2 className="h-5 w-5" />
					</button>{" "}
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onToggleFullscreen();
						}}
						className="text-text hover:text-primary transition-colors"
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
	);
}
