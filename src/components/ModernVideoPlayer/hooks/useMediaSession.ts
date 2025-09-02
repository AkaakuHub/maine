import { useEffect } from "react";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseMediaSessionProps {
	title?: string;
	src: string;
	thumbnailUrl: string | null;
	duration: number;
	currentTime: number;
	playbackRate: number;
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	togglePlay: () => void;
	skipBackward: () => void;
	skipForward: () => void;
}

export function useMediaSession({
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
}: UseMediaSessionProps): void {
	// Media Session API のメタデータとアクションハンドラーを設定（初回のみ）
	useEffect(() => {
		if ("mediaSession" in navigator) {
			try {
				const videoTitle =
					title || src.split("/").pop()?.split(".")[0] || "無題の動画";

				// アクションハンドラーを設定（一度だけ）
				navigator.mediaSession.setActionHandler("play", () => {
					if (videoRef.current?.paused) {
						togglePlay();
					}
				});

				navigator.mediaSession.setActionHandler("pause", () => {
					if (!videoRef.current?.paused) {
						togglePlay();
					}
				});

				navigator.mediaSession.setActionHandler("seekbackward", () => {
					skipBackward();
				});

				navigator.mediaSession.setActionHandler("seekforward", () => {
					skipForward();
				});

				// HTMLのタイトルを更新（一度だけ）
				document.title = `${videoTitle} - My Video Storage`;
			} catch {
				// Media Session API not supported
			}
		}

		return () => {
			// クリーンアップ
			try {
				if ("mediaSession" in navigator) {
					navigator.mediaSession.metadata = null;
					navigator.mediaSession.setActionHandler("play", null);
					navigator.mediaSession.setActionHandler("pause", null);
					navigator.mediaSession.setActionHandler("seekbackward", null);
					navigator.mediaSession.setActionHandler("seekforward", null);
				}
			} catch {
				// エラーを無視
			}
		};
	}, [title, src, videoRef, togglePlay, skipBackward, skipForward]);

	// Media Session API のメタデータを設定（サムネイル含む）
	useEffect(() => {
		if ("mediaSession" in navigator) {
			try {
				const videoTitle =
					title || src.split("/").pop()?.split(".")[0] || "無題の動画";

				// サムネイルの有無に応じてartworkを設定
				const artwork = thumbnailUrl
					? [
							{
								src: thumbnailUrl,
								sizes: "640x360",
								type: "image/jpeg",
							},
						]
					: [
							{
								src: "/favicon.ico",
								sizes: "96x96",
								type: "image/x-icon",
							},
						];

				// @ts-ignore - MediaMetadata は実行時に利用可能
				navigator.mediaSession.metadata = new MediaMetadata({
					title: videoTitle,
					artist: "My Video Storage",
					album: "ビデオ動画",
					artwork,
				});
			} catch {
				// Media Session metadata update failed
			}
		}
	}, [thumbnailUrl, title, src]);

	// Media Session API の位置情報を更新
	useEffect(() => {
		if ("mediaSession" in navigator && duration > 0) {
			try {
				navigator.mediaSession.setPositionState({
					duration: duration,
					playbackRate: playbackRate,
					position: currentTime,
				});
			} catch {
				// Media Session position update failed
			}
		}
	}, [duration, currentTime, playbackRate]);
}
