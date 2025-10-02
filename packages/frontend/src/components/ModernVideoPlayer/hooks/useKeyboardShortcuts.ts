import { useEffect } from "react";
import type { SettingsView } from "../types";

interface UseKeyboardShortcutsProps {
	togglePlay: () => void;
	skipBackward: () => void;
	skipForward: () => void;
	handleVolumeKeyboard: (volume: number) => void;
	currentVolume: number;
	toggleFullscreen: () => Promise<void>;
	toggleMute: () => void;
	takeScreenshot: () => void;
	onShowHelp?: () => void;
	settingsView: SettingsView;
	isFullscreen: boolean;
	setSettingsView: (view: SettingsView) => void;
	setShowSettings: (show: boolean) => void;
}

export function useKeyboardShortcuts({
	togglePlay,
	skipBackward,
	skipForward,
	handleVolumeKeyboard,
	currentVolume,
	toggleFullscreen,
	toggleMute,
	takeScreenshot,
	onShowHelp,
	settingsView,
	isFullscreen,
	setSettingsView,
	setShowSettings,
}: UseKeyboardShortcutsProps): void {
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
					handleVolumeKeyboard(Math.min(1, currentVolume + 0.1));
					break;
				case "ArrowDown":
					e.preventDefault();
					handleVolumeKeyboard(Math.max(0, currentVolume - 0.1));
					break;
				case "KeyF":
					e.preventDefault();
					toggleFullscreen();
					break;
				case "KeyM":
					e.preventDefault();
					toggleMute();
					break;
				case "KeyS":
					e.preventDefault();
					takeScreenshot();
					break;
				case "Slash":
					if (e.shiftKey) {
						// ? キー（Shift + /）
						e.preventDefault();
						onShowHelp?.();
					}
					break;
				case "Escape":
					e.preventDefault();
					if (isFullscreen) {
						// フルスクリーン時はフルスクリーンを解除
						toggleFullscreen();
					} else if (settingsView !== "main") {
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
		handleVolumeKeyboard,
		currentVolume,
		toggleFullscreen,
		toggleMute,
		takeScreenshot,
		onShowHelp,
		settingsView,
		isFullscreen,
		setSettingsView,
		setShowSettings,
	]);
}
