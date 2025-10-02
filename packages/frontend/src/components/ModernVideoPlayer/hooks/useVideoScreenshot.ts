import { useCallback } from "react";
import { formatDuration } from "@/libs/utils";
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

	return {
		takeScreenshot,
	};
}
