import { useCallback } from "react";
import { formatDuration } from "../../../libs/utils";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseVideoScreenshotProps {
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	autoDownloadScreenshot: boolean;
	title?: string;
	currentTime: number;
}

interface VideoScreenshotHandlers {
	takeScreenshot: () => Promise<void>;
}

export function useVideoScreenshot({
	videoRef,
	autoDownloadScreenshot,
	title,
	currentTime,
}: UseVideoScreenshotProps): VideoScreenshotHandlers {
	// iOS Safari検出
	const isIOS = useCallback(() => {
		return (
			/iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(/Mac/.test(navigator.userAgent) && "ontouchend" in document)
		);
	}, []);

	// スクリーンショット取得機能（iOS Safari対応）
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

		// iOS Safari対応: CORSチェック
		if (video.src && video.src !== window.location.href && !video.crossOrigin) {
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
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;

					// ファイル名を生成（動画タイトル + 時間 + ランダム英数字）
					const videoTitle = title || "screenshot";
					const timeStr = formatDuration(currentTime).replace(/:/g, "-");
					const randomId = Math.random().toString(36).substring(2, 8);
					a.download = `${videoTitle}_${timeStr}_${randomId}.png`;

					// iOS Safariではダウンロードを優先
					if (isIOS()) {
						// iOS Safariの場合はユーザージェスチャー内で直接ダウンロード
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						console.log(
							"スクリーンショットをダウンロードしました（iOS Safari）",
						);
					} else {
						// その他のブラウザではクリップボードを試み、失敗したらダウンロード
						if (
							navigator.clipboard?.write &&
							window.isSecureContext &&
							!autoDownloadScreenshot
						) {
							try {
								await navigator.clipboard.write([
									new ClipboardItem({ "image/png": blob }),
								]);
							} catch (clipboardError) {
								console.warn(
									"クリップボードへのコピーに失敗、ダウンロードします:",
									clipboardError,
								);
								document.body.appendChild(a);
								a.click();
								document.body.removeChild(a);
							}
						} else {
							// 自動ダウンロードが有効な場合やクリップボードが使えない場合
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);
						}
					}

					// URLをクリーンアップ
					setTimeout(() => {
						URL.revokeObjectURL(url);
					}, 100);
				} catch (error) {
					console.error("スクリーンショット処理エラー:", error);
				}
			}, "image/png");
		} catch (error) {
			console.error("スクリーンショット取得エラー:", error);
		}
	}, [videoRef, autoDownloadScreenshot, title, currentTime, isIOS]);

	return {
		takeScreenshot,
	};
}
