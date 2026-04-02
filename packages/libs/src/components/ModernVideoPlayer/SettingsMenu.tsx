"use client";

import { useChapterSkipStore } from "../../stores/chapterSkipStore";
import { cn } from "../../libs/utils";
import type { SettingsView } from "./types";
import { ChapterSkipSettingsPanel } from "./settings-menu/ChapterSkipSettingsPanel";
import { MainSettingsPanel } from "./settings-menu/MainSettingsPanel";
import { PlaybackSettingsPanel } from "./settings-menu/PlaybackSettingsPanel";
import { ScreenshotSettingsPanel } from "./settings-menu/ScreenshotSettingsPanel";
import { SkipSettingsPanel } from "./settings-menu/SkipSettingsPanel";
import { useSettingsSheetState } from "./settings-menu/useSettingsSheetState";

interface SettingsMenuProps {
	show: boolean;
	isOpen: boolean;
	settingsView: SettingsView;
	setSettingsView: (view: SettingsView) => void;
	skipSeconds: number;
	skipOptions: number[];
	playbackRate: number;
	autoDownloadScreenshot: boolean;
	isPlaylistAutoplayEnabled: boolean;
	onSkipSecondsChange: (seconds: number) => void;
	onPlaybackRateChange: (rate: number) => void;
	onScreenshotSettingChange: (enabled: boolean) => void;
	onPlaylistAutoplayChange: (enabled: boolean) => void;
	onClose: () => void;
	settingsRef: React.RefObject<HTMLDivElement | null>;
}

export default function SettingsMenu({
	show,
	isOpen,
	settingsView,
	setSettingsView,
	skipSeconds,
	skipOptions,
	playbackRate,
	autoDownloadScreenshot,
	isPlaylistAutoplayEnabled,
	onSkipSecondsChange,
	onPlaybackRateChange,
	onScreenshotSettingChange,
	onPlaylistAutoplayChange,
	onClose,
	settingsRef,
}: SettingsMenuProps) {
	const chapterSkipStore = useChapterSkipStore();
	const {
		isVisible,
		dragOffsetY,
		isDragging,
		handleDragStart,
		handleOverlayMouseDown,
	} = useSettingsSheetState({
		show,
		isOpen,
		onClose,
	});

	if (!show) {
		return null;
	}

	return (
		<div
			className={cn(
				"fixed inset-0 z-[99999] flex items-end transition-all duration-200",
				isVisible
					? "bg-overlay/80 backdrop-blur-[2px]"
					: "bg-transparent backdrop-blur-0",
			)}
			onMouseDown={handleOverlayMouseDown}
		>
			<div
				ref={settingsRef}
				className={cn(
					"mx-auto mb-0 w-full max-w-[40rem] rounded-t-[28px] border border-b-0 border-border bg-surface-variant pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] shadow-2xl transition-transform duration-200 ease-out will-change-transform",
					!isDragging && (isVisible ? "translate-y-0" : "translate-y-full"),
				)}
				style={{ transform: `translateY(${dragOffsetY}px)` }}
			>
				{settingsView === "main" ? (
					<MainSettingsPanel
						skipSeconds={skipSeconds}
						playbackRate={playbackRate}
						autoDownloadScreenshot={autoDownloadScreenshot}
						isPlaylistAutoplayEnabled={isPlaylistAutoplayEnabled}
						enabledChapterSkipCount={
							chapterSkipStore.rules.filter((rule) => rule.enabled).length
						}
						onDragStart={handleDragStart}
						onOpenView={setSettingsView}
						onPlaylistAutoplayChange={onPlaylistAutoplayChange}
					/>
				) : null}

				{settingsView === "skip" ? (
					<SkipSettingsPanel
						skipSeconds={skipSeconds}
						skipOptions={skipOptions}
						onBack={() => setSettingsView("main")}
						onSelect={onSkipSecondsChange}
					/>
				) : null}

				{settingsView === "playback" ? (
					<PlaybackSettingsPanel
						playbackRate={playbackRate}
						onBack={() => setSettingsView("main")}
						onSelect={onPlaybackRateChange}
					/>
				) : null}

				{settingsView === "screenshot" ? (
					<ScreenshotSettingsPanel
						autoDownloadScreenshot={autoDownloadScreenshot}
						onBack={() => setSettingsView("main")}
						onSelect={onScreenshotSettingChange}
					/>
				) : null}

				{settingsView === "chapter-skip" ? (
					<ChapterSkipSettingsPanel onBack={() => setSettingsView("main")} />
				) : null}
			</div>
		</div>
	);
}
