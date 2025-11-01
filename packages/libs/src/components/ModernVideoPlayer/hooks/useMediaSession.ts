import { useEffect, useCallback, useRef } from "react";
import type { HTMLVideoElementWithFullscreen } from "../types";
import { createApiUrl } from "../../../utils/api";

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

	const fallBackArray = [
		{ src: "/favicon.ico", sizes: "96x96", type: "image/x-icon" },
	];

	// Blob URLを管理するためのMap
	const blobUrlMapRef = useRef(new Map<string, string>());

	// Blobを作成してartworkを設定する関数
	const createArtworkWithBlob = useCallback(
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

				// 画像を一旦canvasに描画して、全く同じサイズで、どのブラウザでも表示できるpngに変換してから、media sessionに渡す
				const img = document.createElement("img");
				const objectUrl = URL.createObjectURL(tempBlob);
				img.src = objectUrl;

				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () => reject(new Error("Image load error"));
				});

				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext("2d");
				if (!ctx) throw new Error("Failed to get canvas context");
				ctx.drawImage(img, 0, 0);

				// canvasからpngのBlobを取得
				const pngBlob: Blob = await new Promise((res) =>
					canvas.toBlob((b) => {
						if (b) res(b);
					}, "image/png"),
				);

				// 一時的なオブジェクトURLを解放
				URL.revokeObjectURL(objectUrl);

				// 最終的にmedia sessionに渡すBlob
				const blob = pngBlob;
				const blobUrl = URL.createObjectURL(blob);

				// Blob URLをマップに保存して後でクリーンアップできるようにする
				blobUrlMapRef.current.set(thumbnailPath, blobUrl);

				// Blob URLを使用したartwork配列を返す
				return [
					{ src: blobUrl, sizes: "640x360", type: blob.type },
					{ src: blobUrl, sizes: "512x512", type: blob.type },
					{ src: blobUrl, sizes: "96x96", type: blob.type },
				];
			} catch (error) {
				console.warn("Failed to create blob artwork", error);
				return fallBackArray;
			}
		},
		[],
	);

	// Media Session API のメタデータを設定（サムネイル含む）
	useEffect(() => {
		if ("mediaSession" in navigator) {
			const setupMediaMetadata = async () => {
				try {
					const videoTitle =
						title || src.split("/").pop()?.split(".")[0] || "無題の動画";

					let artwork: MediaImage[];

					if (thumbnailPath) {
						// サムネイルがある場合はBlobを使用してartworkを設定
						artwork = await createArtworkWithBlob(thumbnailPath);
					} else {
						// サムネイルがない場合はfaviconを使用
						artwork = fallBackArray;
					}

					navigator.mediaSession.metadata = new MediaMetadata({
						title: videoTitle,
						artist: "Maine",
						album: "ビデオ動画",
						artwork,
					});
				} catch (error) {
					console.warn("Media Session metadata update failed:", error);
				}
			};

			setupMediaMetadata();
		}

		// クリーンアップ関数
		return () => {
			// Blob URLをクリーンアップ
			for (const blobUrl of blobUrlMapRef.current.values()) {
				URL.revokeObjectURL(blobUrl);
			}
			blobUrlMapRef.current.clear();
		};
	}, [thumbnailPath, title, src, createArtworkWithBlob]);

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
