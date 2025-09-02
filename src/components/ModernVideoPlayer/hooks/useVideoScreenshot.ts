import { useState, useEffect, useCallback } from "react";
import { formatDuration } from "@/libs/utils";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseVideoScreenshotProps {
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	autoDownloadScreenshot: boolean;
	title?: string;
	currentTime: number;
}

interface VideoScreenshotState {
	thumbnailUrl: string | null;
}

interface VideoScreenshotHandlers {
	takeScreenshot: () => Promise<void>;
}

export function useVideoScreenshot({
	videoRef,
	autoDownloadScreenshot,
	title,
	currentTime,
}: UseVideoScreenshotProps): VideoScreenshotState & VideoScreenshotHandlers {
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

	// 動画の特定位置のフレームをキャプチャしてサムネイルを生成
	const generateVideoThumbnail = useCallback(
		(timePosition = 0.01): Promise<string | null> => {
			return new Promise((resolve) => {
				if (!videoRef.current || videoRef.current.readyState < 2) {
					console.warn("Video not ready for thumbnail capture");
					resolve(null);
					return;
				}

				const video = videoRef.current;
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");

				if (!ctx) {
					console.error("Canvas context not available");
					resolve(null);
					return;
				}

				// キャンバスのサイズを動画に合わせる
				canvas.width = video.videoWidth || 640;
				canvas.height = video.videoHeight || 360;

				// 現在の再生位置を保存
				const originalTime = video.currentTime;
				const originalPaused = video.paused;

				// サムネイル用の時間位置に移動（デフォルトは動画の1%の位置）
				const targetTime = Math.min(
					video.duration * timePosition,
					video.duration - 0.1, // 最後から0.1秒前まで
				);

				const onSeeked = () => {
					try {
						// フレームをキャンバスに描画
						ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

						// DataURLとして画像を取得
						const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8);

						// 元の位置に戻す
						video.currentTime = originalTime;
						if (!originalPaused) {
							video.play().catch(() => {
								// エラーを無視
							});
						}

						resolve(thumbnailDataUrl);
					} catch (error) {
						console.error("Error generating thumbnail:", error);
						// 元の位置に戻す
						video.currentTime = originalTime;
						if (!originalPaused) {
							video.play().catch(() => {
								// エラーを無視
							});
						}
						resolve(null);
					} finally {
						video.removeEventListener("seeked", onSeeked);
					}
				};

				// seekedイベントをリスニング
				video.addEventListener("seeked", onSeeked, { once: true });

				// 指定位置にシーク
				video.currentTime = targetTime;
			});
		},
		[videoRef],
	);

	// スクリーンショット取得機能（現在のフレーム）
	const takeScreenshot = useCallback(async () => {
		if (!videoRef.current || videoRef.current.readyState < 2) {
			console.warn("Video not ready for screenshot");
			return;
		}

		const video = videoRef.current;
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			console.error("Canvas context not available");
			return;
		}

		// キャンバスのサイズを動画に合わせる
		canvas.width = video.videoWidth || 640;
		canvas.height = video.videoHeight || 360;

		try {
			// 現在のフレームをキャンバスに描画
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Canvas から Blob を作成
			canvas.toBlob(async (blob) => {
				if (!blob) return;

				try {
					// クリップボードAPIが使用可能かチェック
					if (navigator.clipboard?.write && window.isSecureContext) {
						await navigator.clipboard.write([
							new ClipboardItem({ "image/png": blob }),
						]);
						console.log("スクリーンショットをクリップボードにコピーしました");
					} else {
						console.warn(
							"クリップボードAPIが使用できません（HTTPS接続またはlocalhostでのみ利用可能）",
						);
					}

					// 自動ダウンロードが有効な場合はダウンロードも実行
					if (autoDownloadScreenshot) {
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;

						// ファイル名を生成（動画タイトル + 時間 + ランダム英数字）
						const videoTitle = title || "screenshot";
						const timeStr = formatDuration(currentTime).replace(/:/g, "-");
						const randomId = Math.random().toString(36).substring(2, 8);
						a.download = `${videoTitle}_${timeStr}_${randomId}.png`;

						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);

						console.log("スクリーンショットをダウンロードしました");
					}
				} catch (error) {
					console.error("クリップボードへのコピーに失敗:", error);
				}
			}, "image/png");
		} catch (error) {
			console.error("スクリーンショット取得エラー:", error);
		}
	}, [videoRef, autoDownloadScreenshot, title, currentTime]);

	// 動画のメタデータが読み込まれた際にサムネイルを生成
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleLoadedMetadata = async () => {
			// サムネイルを生成（動画の1%の位置）
			const thumbnail = await generateVideoThumbnail(0.01);
			if (thumbnail) {
				setThumbnailUrl(thumbnail);
			}
		};

		// メタデータが既に読み込まれている場合は即座に実行
		if (video.readyState >= 1) {
			handleLoadedMetadata();
		} else {
			video.addEventListener("loadedmetadata", handleLoadedMetadata);
		}

		return () => {
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
		};
	}, [videoRef, generateVideoThumbnail]);

	return {
		thumbnailUrl,
		takeScreenshot,
	};
}
