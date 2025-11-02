import { useCallback, useEffect } from "react";
import { createApiUrl } from "../../../utils/api";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseMediaSessionProps {
	title?: string;
	src: string;
	thumbnailPath?: string;
	duration: number;
	currentTime: number;
	playbackRate: number;
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	togglePlay: () => void;
	skipBackward: () => void;
	skipForward: () => void;
	isPlaying: boolean;
}

export function useMediaSession({
	title,
	src,
	thumbnailPath,
	duration,
	currentTime,
	playbackRate,
	videoRef,
	togglePlay,
	skipBackward,
	skipForward,
	isPlaying,
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
				document.title = `${videoTitle} - Maine`;
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

	const ARTWORK_SIZES = [
		{ width: 640, height: 360, label: "640x360" },
		{ width: 512, height: 512, label: "512x512" },
		{ width: 96, height: 96, label: "96x96" },
	];

	const fallBackArray = [
		{ src: "/favicon.ico", sizes: "96x96", type: "image/x-icon" },
	];

	// アスペクト比を維持したまま画像をリサイズして指定サイズに収める関数
	const resizeImageKeepingAspectRatio = useCallback(
		(
			img: HTMLImageElement,
			targetWidth: number,
			targetHeight: number,
		): { width: number; height: number; offsetX: number; offsetY: number } => {
			const imgAspect = img.width / img.height;
			const targetAspect = targetWidth / targetHeight;

			let drawWidth: number;
			let drawHeight: number;
			let offsetX: number;
			let offsetY: number;

			if (imgAspect > targetAspect) {
				// 画像が横長の場合：高さを基準にして横を収める
				drawHeight = targetHeight;
				drawWidth = drawHeight * imgAspect;
				offsetX = (targetWidth - drawWidth) / 2;
				offsetY = 0;
			} else {
				// 画像が縦長または正方形の場合：幅を基準にして高さを収める
				drawWidth = targetWidth;
				drawHeight = drawWidth / imgAspect;
				offsetX = 0;
				offsetY = (targetHeight - drawHeight) / 2;
			}

			return { width: drawWidth, height: drawHeight, offsetX, offsetY };
		},
		[],
	);

	// 指定サイズの画像Data URLを作成する関数
	const createResizedDataURL = useCallback(
		(
			img: HTMLImageElement,
			targetWidth: number,
			targetHeight: number,
		): Promise<string> => {
			return new Promise((resolve, reject) => {
				const canvas = document.createElement("canvas");
				canvas.width = targetWidth;
				canvas.height = targetHeight;
				const ctx = canvas.getContext("2d");

				if (!ctx) {
					reject(new Error("Failed to get canvas context"));
					return;
				}

				// 背景を黒で塗りつぶす
				ctx.fillStyle = "#000000";
				ctx.fillRect(0, 0, targetWidth, targetHeight);

				// アスペクト比を維持したまま画像を配置
				const {
					width: drawWidth,
					height: drawHeight,
					offsetX,
					offsetY,
				} = resizeImageKeepingAspectRatio(img, targetWidth, targetHeight);

				ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

				try {
					// Data URLを生成（Safariでもサポート）
					// pngはだめらしい。jpegにする
					const dataURL = canvas.toDataURL("image/jpeg");
					resolve(dataURL);
				} catch {
					reject(new Error("Failed to create data URL from canvas"));
				}
			});
		},
		[resizeImageKeepingAspectRatio],
	);

	// Data URLを作成してartworkを設定する関数
	const createArtworkWithDataURL = useCallback(
		async (thumbnailPath: string): Promise<MediaImage[]> => {
			try {
				// 複数サイズの画像URLを生成
				const thumbnailUrl = createApiUrl(`/thumbnails/${thumbnailPath}`);

				// 認証付きでサムネイルを取得
				const response = await fetch(thumbnailUrl, { credentials: "include" });
				if (!response.ok) {
					throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
				}

				const tempBlob = await response.blob();

				// 画像を一旦読み込み
				const img = document.createElement("img");
				const objectUrl = URL.createObjectURL(tempBlob);
				img.src = objectUrl;

				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () => reject(new Error("Image load error"));
				});

				// 各サイズの画像を生成（Data URL使用）
				const artworkPromises = ARTWORK_SIZES.map(async (size) => {
					const dataURL = await createResizedDataURL(
						img,
						size.width,
						size.height,
					);
					return {
						src: dataURL,
						sizes: size.label,
						type: "image/jpeg",
					};
				});

				const artwork = await Promise.all(artworkPromises);

				// 一時的なオブジェクトURLを解放
				URL.revokeObjectURL(objectUrl);

				return artwork;
			} catch (error) {
				console.warn("Failed to create Data URL artwork", error);
				return fallBackArray;
			}
		},
		[createResizedDataURL],
	);

	// Media Session API のメタデータを設定（再生開始時に設定）
	const setupMediaMetadata = useCallback(async () => {
		if (!("mediaSession" in navigator)) return;

		try {
			const videoTitle =
				title || src.split("/").pop()?.split(".")[0] || "無題の動画";

			let artwork: MediaImage[];

			if (thumbnailPath) {
				// サムネイルがある場合はData URLを使用してartworkを設定
				artwork = await createArtworkWithDataURL(thumbnailPath);
			} else {
				// サムネイルがない場合はfaviconを使用
				artwork = fallBackArray;
			}

			console.log("media sessionを設定:");
			navigator.mediaSession.metadata = new MediaMetadata({
				title: videoTitle,
				artist: "Maine",
				album: "ビデオ動画",
				artwork,
			});
		} catch (error) {
			console.warn("Media Session metadata update failed:", error);
		}
	}, [thumbnailPath, title, src, createArtworkWithDataURL]);

	// 再生開始時にMedia Sessionを設定
	useEffect(() => {
		if (isPlaying && "mediaSession" in navigator) {
			// 再生開始時にのみMedia Sessionを設定
			setupMediaMetadata();
		}

		return () => {
			// コンポーネントクリーンアップ
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
	}, [isPlaying, setupMediaMetadata]);

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
