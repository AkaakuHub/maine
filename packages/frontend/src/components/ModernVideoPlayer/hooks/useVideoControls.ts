import { useState, useRef, useCallback, useEffect } from "react";
import type { SettingsView } from "../types";

interface UseVideoControlsProps {
	isPlaying: boolean;
	containerRef: React.RefObject<HTMLDivElement | null>;
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
	containerRef,
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

	// 設定パネルの外側クリック検知
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				settingsRef.current &&
				!settingsRef.current.contains(event.target as Node) &&
				settingsButtonRef.current &&
				!settingsButtonRef.current.contains(event.target as Node)
			) {
				setShowSettings(false);
				setSettingsView("main");
			}
		};

		if (showSettings) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showSettings]);

	// マウス移動でコントロール表示
	useEffect(() => {
		resetControlsTimeout();
	}, [resetControlsTimeout]);

	// 別のアプリにフォーカスがあってもマウスホバーを検出するための強化されたマウス検出
	useEffect(() => {
		if (!containerRef.current) return;

		const container = containerRef.current;
		let isMouseInside = false;

		const handleMouseEnterCapture = () => {
			if (!isMouseInside) {
				isMouseInside = true;
				setShowControls(true);
				resetControlsTimeout();
			}
		};

		const handleMouseLeaveCapture = () => {
			isMouseInside = false;
			if (isPlaying) {
				setShowControls(false);
			}
		};

		const handleMouseMoveCapture = () => {
			if (isMouseInside) {
				setShowControls(true);
				resetControlsTimeout();
			}
		};

		// Capture phaseでイベントを検出してウィンドウフォーカスに関係なくホバーを検出
		container.addEventListener("mouseenter", handleMouseEnterCapture, {
			capture: true,
		});
		container.addEventListener("mouseleave", handleMouseLeaveCapture, {
			capture: true,
		});
		container.addEventListener("mousemove", handleMouseMoveCapture, {
			capture: true,
		});

		return () => {
			container.removeEventListener("mouseenter", handleMouseEnterCapture, {
				capture: true,
			});
			container.removeEventListener("mouseleave", handleMouseLeaveCapture, {
				capture: true,
			});
			container.removeEventListener("mousemove", handleMouseMoveCapture, {
				capture: true,
			});
		};
	}, [isPlaying, resetControlsTimeout, containerRef]);

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
