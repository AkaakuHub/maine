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
	SkipBack,
	SkipForward,
	List,
} from "lucide-react";
import { useState } from "react";
import { cn, formatDuration } from "@/libs/utils";
import type { SettingsView } from "./types";
import ChapterProgressBar from "./ChapterProgressBar";
import type { VideoChapter } from "@/services/chapterService";

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
	chapters: VideoChapter[];
	getSeekStep: () => number;
	onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onSeekToTime: (time: number) => void;
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
	chapters,
	getSeekStep,
	onSeek,
	onSeekToTime,
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
	const [showChapterList, setShowChapterList] = useState(false);

	return (
		<div
			className={cn(
				"absolute inset-x-0 bottom-0 bg-gradient-to-t from-overlay via-overlay/50 to-transparent transition-opacity duration-300 p-4",
				show ? "opacity-100" : "opacity-0",
			)}
		>
			{/* チャプター対応プログレスバー */}
			<ChapterProgressBar
				duration={duration}
				currentTime={currentTime}
				chapters={chapters}
				onSeek={onSeek}
				getSeekStep={getSeekStep}
			/>

			{/* 下部コントロール */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onTogglePlay}
						className="text-white hover:text-primary transition-colors" // tailwind-ignore
					>
						{isPlaying ? (
							<Pause className="h-6 w-6" />
						) : (
							<Play className="h-6 w-6" />
						)}
					</button>

					{/* カスタムスキップボタン */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onSkipBackward}
							className="text-white hover:text-primary transition-colors flex items-center gap-1" // tailwind-ignore
							title={`${skipSeconds}秒戻す`}
						>
							<RotateCcw className="h-5 w-5" />
							<span className="text-xs w-6">{skipSeconds}s</span>
						</button>

						<button
							type="button"
							onClick={onSkipForward}
							className="text-white hover:text-primary transition-colors flex items-center gap-1" // tailwind-ignore
							title={`${skipSeconds}秒進む`}
						>
							<RotateCw className="h-5 w-5" />
							<span className="text-xs w-6">{skipSeconds}s</span>
						</button>
					</div>

					{/* チャプター移動ボタン */}
					{chapters.length > 0 && (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									const currentChapter = chapters.find(
										(chapter) =>
											currentTime >= chapter.startTime &&
											currentTime <= chapter.endTime,
									);
									if (!currentChapter) return;

									if (currentTime - currentChapter.startTime < 3) {
										const prevChapterIndex =
											chapters.findIndex((c) => c.id === currentChapter.id) - 1;
										if (prevChapterIndex >= 0) {
											onSeekToTime(chapters[prevChapterIndex].startTime);
										}
									} else {
										onSeekToTime(currentChapter.startTime);
									}
								}}
								className="text-white hover:text-primary transition-colors" // tailwind-ignore
								title="前のチャプター"
							>
								<SkipBack className="h-5 w-5" />
							</button>

							<button
								type="button"
								onClick={() => {
									const currentChapter = chapters.find(
										(chapter) =>
											currentTime >= chapter.startTime &&
											currentTime <= chapter.endTime,
									);
									if (!currentChapter) return;

									const nextChapterIndex =
										chapters.findIndex((c) => c.id === currentChapter.id) + 1;
									if (nextChapterIndex < chapters.length) {
										onSeekToTime(chapters[nextChapterIndex].startTime);
									}
								}}
								className="text-white hover:text-primary transition-colors" // tailwind-ignore
								title="次のチャプター"
							>
								<SkipForward className="h-5 w-5" />
							</button>

							<button
								type="button"
								onClick={() => setShowChapterList(!showChapterList)}
								className="text-white hover:text-primary transition-colors" // tailwind-ignore
								title="チャプター一覧"
							>
								<List className="h-5 w-5" />
							</button>
						</div>
					)}

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onToggleMute}
							className="text-white hover:text-primary transition-colors" // tailwind-ignore
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
					<span
						className="text-white text-sm font-mono flex gap-1" // tailwind-ignore
					>
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
							className="text-white hover:text-primary transition-colors relative top-[2.5px]" // tailwind-ignore
						>
							<Settings className="h-5 w-5" />
						</button>
					</div>
					<button
						type="button"
						onClick={onTakeScreenshot}
						className="text-white hover:text-primary transition-colors" // tailwind-ignore
						title="スクリーンショットを撮る"
					>
						<Camera className="h-5 w-5" />
					</button>
					<button
						type="button"
						onClick={onTogglePictureInPicture}
						className="text-white hover:text-primary transition-colors" // tailwind-ignore
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
						className="text-white hover:text-primary transition-colors" // tailwind-ignore
					>
						{isFullscreen ? (
							<Minimize className="h-5 w-5" />
						) : (
							<Maximize className="h-5 w-5" />
						)}
					</button>
				</div>
			</div>

			{/* チャプターリストオーバーレイ */}
			{showChapterList && chapters.length > 0 && (
				<div className="absolute bottom-16 left-0 right-0 bg-surface/90 rounded-lg p-4 max-h-60 overflow-y-auto z-50">
					<h3 className="text-text-secondary font-semibold mb-2">チャプター</h3>
					<div className="space-y-1">
						{chapters.map((chapter) => {
							const currentChapter = chapters.find(
								(ch) =>
									currentTime >= ch.startTime && currentTime <= ch.endTime,
							);
							const isActive = currentChapter?.id === chapter.id;
							const minutes = Math.floor(chapter.startTime / 60);
							const seconds = Math.floor(chapter.startTime % 60);

							return (
								<button
									key={chapter.id}
									type="button"
									onClick={() => {
										onSeekToTime(chapter.startTime);
										setShowChapterList(false);
									}}
									className={cn(
										"w-full text-left flex items-center justify-between p-2 rounded transition-colors",
										isActive
											? "bg-primary text-text-inverse"
											: "text-text-secondary hover:bg-surface-elevated hover:text-white", // tailwind-ignore
									)}
								>
									<span className="flex-1">{chapter.title}</span>
									<span className="text-xs opacity-75">
										{minutes}:{seconds.toString().padStart(2, "0")}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
