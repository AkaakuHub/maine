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

	// モバイル端末検出
	const isMobile = useCallback(() => {
		return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent,
		);
	}, []);

	// Web Share APIが利用可能かチェック
	const canShare = useCallback((): boolean => {
		return !!navigator.share;
	}, []);

	// スクリーンショットをダウンロードするヘルパー関数
	const downloadScreenshot = useCallback(
		(fileName: string, a: HTMLAnchorElement) => {
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		},
		[],
	);

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
					const fileName = `${videoTitle}_${timeStr}_${randomId}.png`;

					// モバイル端末で共有APIが利用可能な場合は共有を試みる
					if (isMobile() && canShare()) {
						try {
							const file = new File([blob], fileName, { type: "image/png" });
							await navigator.share({
								title: "動画スクリーンショット",
								text: `${videoTitle} (${formatDuration(currentTime)})`,
								files: [file],
							});
						} catch (shareError) {
							if (
								shareError instanceof Error &&
								shareError.name === "AbortError"
							) {
								console.log("共有がキャンセルされました");
							} else {
								console.warn("共有に失敗、ダウンロードします:", shareError);
								// 共有に失敗した場合はダウンロードにフォールバック
								downloadScreenshot(fileName, a);
							}
						}
					} else if (isIOS()) {
						// iOS Safariではダウンロードを優先
						downloadScreenshot(fileName, a);
					} else {
						// デスクトップブラウザではクリップボードを試み、失敗したらダウンロード
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
								downloadScreenshot(fileName, a);
							}
						} else {
							// 自動ダウンロードが有効な場合やクリップボードが使えない場合
							downloadScreenshot(fileName, a);
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
	}, [
		videoRef,
		autoDownloadScreenshot,
		title,
		currentTime,
		isIOS,
		isMobile,
		canShare,
		downloadScreenshot,
	]);

	return {
		takeScreenshot,
	};
}
