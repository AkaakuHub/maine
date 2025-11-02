import { useCallback, useState } from "react";

interface VideoPlayerSettings {
	volume: number;
	playbackRate: number;
	skipSeconds: number;
	isShowRestTime: boolean;
	autoDownloadScreenshot: boolean;
}

interface VideoPlayerSettingsHandlers {
	setVolume: (volume: number) => void;
	setPlaybackRate: (rate: number) => void;
	setSkipSeconds: (seconds: number) => void;
	setIsShowRestTime: (show: boolean) => void;
	setAutoDownloadScreenshot: (enabled: boolean) => void;
}

export function useVideoPlayerSettings(): VideoPlayerSettings &
	VideoPlayerSettingsHandlers {
	// LocalStorageから設定を読み込み
	const [volume, setVolumeState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-volume");
			return saved ? Number.parseFloat(saved) : 1;
		}
		return 1;
	});

	const [playbackRate, setPlaybackRateState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-playback-rate");
			return saved ? Number.parseFloat(saved) : 1;
		}
		return 1;
	});

	const [skipSeconds, setSkipSecondsState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-skip-seconds");
			return saved ? Number.parseInt(saved, 10) : 10;
		}
		return 10;
	});

	const [isShowRestTime, setIsShowRestTimeState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-show-rest-time");
			return saved === "true";
		}
		return false;
	});

	const [autoDownloadScreenshot, setAutoDownloadScreenshotState] = useState(
		() => {
			if (typeof window !== "undefined") {
				const saved = localStorage.getItem("screenshot-auto-download");
				return saved === "true";
			}
			return false;
		},
	);

	// LocalStorageに保存するハンドラー関数
	const setVolume = useCallback((volume: number) => {
		setVolumeState(volume);
		localStorage.setItem("video-player-volume", volume.toString());
	}, []);

	const setPlaybackRate = useCallback((rate: number) => {
		setPlaybackRateState(rate);
		localStorage.setItem("video-player-playback-rate", rate.toString());
	}, []);

	const setSkipSeconds = useCallback((seconds: number) => {
		setSkipSecondsState(seconds);
		localStorage.setItem("video-player-skip-seconds", seconds.toString());
	}, []);

	const setIsShowRestTime = useCallback((show: boolean) => {
		setIsShowRestTimeState(show);
		localStorage.setItem("video-player-show-rest-time", show.toString());
	}, []);

	const setAutoDownloadScreenshot = useCallback((enabled: boolean) => {
		setAutoDownloadScreenshotState(enabled);
		localStorage.setItem("screenshot-auto-download", enabled.toString());
	}, []);

	return {
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
	};
}
