import { useCallback, useEffect, useRef, useState } from "react";
import type { SettingsView } from "../types";

interface UseVideoControlsProps {
	isPlaying: boolean;
}

interface VideoControlsState {
	showControls: boolean;
	showSettings: boolean;
	settingsView: SettingsView;
	settingsRef: React.RefObject<HTMLDivElement | null>;
	settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
}

interface VideoControlsHandlers {
	setShowControls: (show: boolean) => void;
	setShowSettings: (show: boolean) => void;
	setSettingsView: (view: SettingsView) => void;
	resetControlsTimeout: () => void;
}

export function useVideoControls({
	isPlaying,
}: UseVideoControlsProps): VideoControlsState & VideoControlsHandlers {
	const [showControls, setShowControls] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [settingsView, setSettingsView] = useState<SettingsView>("main");

	const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const settingsRef = useRef<HTMLDivElement>(null);
	const settingsButtonRef = useRef<HTMLButtonElement>(null);

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

	// マウス移動でコントロール表示
	useEffect(() => {
		resetControlsTimeout();
	}, [resetControlsTimeout]);

	// クリーンアップ処理
	useEffect(() => {
		return () => {
			if (controlsTimeoutRef.current) {
				clearTimeout(controlsTimeoutRef.current);
			}
		};
	}, []);

	return {
		showControls,
		showSettings,
		settingsView,
		settingsRef,
		settingsButtonRef,
		setShowControls,
		setShowSettings,
		setSettingsView,
		resetControlsTimeout,
	};
}
