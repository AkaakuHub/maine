import { useCallback, useState } from "react";
import {
	getStoredItem,
	setStoredItem,
} from "../../../application/services/session-storage-service";
import { VIDEO_PLAYER } from "../../../utils/constants";

interface VideoPlayerSettings {
	volume: number;
	playbackRate: number;
	skipSeconds: number;
	isShowRestTime: boolean;
	autoDownloadScreenshot: boolean;
	isPlaylistAutoplayEnabled: boolean;
}

interface VideoPlayerSettingsHandlers {
	setVolume: (volume: number) => void;
	setPlaybackRate: (rate: number) => void;
	setSkipSeconds: (seconds: number) => void;
	setIsShowRestTime: (show: boolean) => void;
	setAutoDownloadScreenshot: (enabled: boolean) => void;
	setIsPlaylistAutoplayEnabled: (enabled: boolean) => void;
}

export function useVideoPlayerSettings(): VideoPlayerSettings &
	VideoPlayerSettingsHandlers {
	// LocalStorageから設定を読み込み
	const [volume, setVolumeState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = getStoredItem(VIDEO_PLAYER.STORAGE_KEYS.VOLUME);
			return saved ? Number.parseFloat(saved) : VIDEO_PLAYER.DEFAULT_VOLUME;
		}
		return VIDEO_PLAYER.DEFAULT_VOLUME;
	});

	const [playbackRate, setPlaybackRateState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = getStoredItem(VIDEO_PLAYER.STORAGE_KEYS.PLAYBACK_RATE);
			return saved
				? Number.parseFloat(saved)
				: VIDEO_PLAYER.DEFAULT_PLAYBACK_RATE;
		}
		return VIDEO_PLAYER.DEFAULT_PLAYBACK_RATE;
	});

	const [skipSeconds, setSkipSecondsState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = getStoredItem(VIDEO_PLAYER.STORAGE_KEYS.SKIP_SECONDS);
			return saved
				? Number.parseInt(saved, 10)
				: VIDEO_PLAYER.DEFAULT_SKIP_SECONDS;
		}
		return VIDEO_PLAYER.DEFAULT_SKIP_SECONDS;
	});

	const [isShowRestTime, setIsShowRestTimeState] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = getStoredItem(VIDEO_PLAYER.STORAGE_KEYS.SHOW_REST_TIME);
			return saved === "true";
		}
		return false;
	});

	const [autoDownloadScreenshot, setAutoDownloadScreenshotState] = useState(
		() => {
			if (typeof window !== "undefined") {
				const saved = getStoredItem(
					VIDEO_PLAYER.STORAGE_KEYS.AUTO_DOWNLOAD_SCREENSHOT,
				);
				return saved === "true";
			}
			return false;
		},
	);

	const [isPlaylistAutoplayEnabled, setIsPlaylistAutoplayEnabledState] =
		useState(() => {
			if (typeof window !== "undefined") {
				const saved = getStoredItem(
					VIDEO_PLAYER.STORAGE_KEYS.PLAYLIST_AUTOPLAY,
				);
				return saved !== "false";
			}
			return true;
		});

	// LocalStorageに保存するハンドラー関数
	const setVolume = useCallback((volume: number) => {
		setVolumeState(volume);
		setStoredItem(VIDEO_PLAYER.STORAGE_KEYS.VOLUME, volume.toString());
	}, []);

	const setPlaybackRate = useCallback((rate: number) => {
		setPlaybackRateState(rate);
		setStoredItem(VIDEO_PLAYER.STORAGE_KEYS.PLAYBACK_RATE, rate.toString());
	}, []);

	const setSkipSeconds = useCallback((seconds: number) => {
		setSkipSecondsState(seconds);
		setStoredItem(VIDEO_PLAYER.STORAGE_KEYS.SKIP_SECONDS, seconds.toString());
	}, []);

	const setIsShowRestTime = useCallback((show: boolean) => {
		setIsShowRestTimeState(show);
		setStoredItem(VIDEO_PLAYER.STORAGE_KEYS.SHOW_REST_TIME, show.toString());
	}, []);

	const setAutoDownloadScreenshot = useCallback((enabled: boolean) => {
		setAutoDownloadScreenshotState(enabled);
		setStoredItem(
			VIDEO_PLAYER.STORAGE_KEYS.AUTO_DOWNLOAD_SCREENSHOT,
			enabled.toString(),
		);
	}, []);

	const setIsPlaylistAutoplayEnabled = useCallback((enabled: boolean) => {
		setIsPlaylistAutoplayEnabledState(enabled);
		setStoredItem(
			VIDEO_PLAYER.STORAGE_KEYS.PLAYLIST_AUTOPLAY,
			enabled.toString(),
		);
	}, []);

	return {
		volume,
		playbackRate,
		skipSeconds,
		isShowRestTime,
		autoDownloadScreenshot,
		isPlaylistAutoplayEnabled,
		setVolume,
		setPlaybackRate,
		setSkipSeconds,
		setIsShowRestTime,
		setAutoDownloadScreenshot,
		setIsPlaylistAutoplayEnabled,
	};
}
