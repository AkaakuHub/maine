import { useCallback, useEffect, useState } from "react";
import type {
	DocumentWithFullscreen,
	HTMLElementWithFullscreen,
	HTMLVideoElementWithFullscreen,
} from "../types";

interface UseVideoFullscreenProps {
	containerRef: React.RefObject<HTMLDivElement | null>;
	videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface VideoFullscreenState {
	isFullscreen: boolean;
}

interface VideoFullscreenHandlers {
	toggleFullscreen: () => Promise<void>;
}

export function useVideoFullscreen({
	containerRef,
	videoRef,
}: UseVideoFullscreenProps): VideoFullscreenState & VideoFullscreenHandlers {
	const [isFullscreen, setIsFullscreen] = useState(false);

	// iOS Safari検出
	const isIOS = useCallback(() => {
		return (
			/iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(/Mac/.test(navigator.userAgent) && "ontouchend" in document)
		);
	}, []);

	// フルスクリーン切り替え - ブラウザ間互換性を考慮（iOS Safari対応）
	const toggleFullscreen = useCallback(async () => {
		if (!videoRef.current) return;

		const doc = document as DocumentWithFullscreen;
		const video = videoRef.current as HTMLVideoElementWithFullscreen;

		try {
			// フルスクリーン状態の確認（ベンダープレフィックス対応）
			const fullscreenElement =
				doc.fullscreenElement ||
				doc.webkitFullscreenElement ||
				doc.mozFullScreenElement ||
				doc.msFullscreenElement;

			if (fullscreenElement) {
				// フルスクリーン解除
				if (doc.exitFullscreen) {
					await doc.exitFullscreen();
				} else if (doc.webkitExitFullscreen) {
					await doc.webkitExitFullscreen();
				} else if (doc.mozCancelFullScreen) {
					await doc.mozCancelFullScreen();
				} else if (doc.msExitFullscreen) {
					await doc.msExitFullscreen();
				}
			} else {
				// iOS Safariの場合はビデオ要素を直接フルスクリーンに
				if (isIOS()) {
					// iOS Safari用のAPI
					if (video.webkitEnterFullscreen) {
						await video.webkitEnterFullscreen();
					} else if (video.webkitRequestFullscreen) {
						await video.webkitRequestFullscreen();
					} else if (video.requestFullscreen) {
						await video.requestFullscreen();
					}
				} else {
					// その他のブラウザではコンテナをフルスクリーンに
					const container = containerRef.current as HTMLElementWithFullscreen;
					if (container?.requestFullscreen) {
						await container.requestFullscreen();
					} else if (container?.webkitRequestFullscreen) {
						await container.webkitRequestFullscreen();
					} else if (container?.mozRequestFullScreen) {
						await container.mozRequestFullScreen();
					} else if (container?.msRequestFullscreen) {
						await container.msRequestFullscreen();
					}
				}
			}
		} catch (error) {
			console.error("Fullscreen error:", error);
			alert("お使いのブラウザはフルスクリーンに対応していません。");
		}
	}, [containerRef, videoRef, isIOS]);

	// フルスクリーン状態の変更を監視
	useEffect(() => {
		const handleFullscreenChange = () => {
			const doc = document as DocumentWithFullscreen;
			const fullscreenElement =
				doc.fullscreenElement ||
				doc.webkitFullscreenElement ||
				doc.mozFullScreenElement ||
				doc.msFullscreenElement;

			setIsFullscreen(!!fullscreenElement);
		};

		// 標準とベンダープレフィックス付きイベントリスナーを追加
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
		document.addEventListener("mozfullscreenchange", handleFullscreenChange);
		document.addEventListener("msfullscreenchange", handleFullscreenChange);

		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.removeEventListener(
				"webkitfullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener(
				"mozfullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener(
				"msfullscreenchange",
				handleFullscreenChange,
			);
		};
	}, []);

	return {
		isFullscreen,
		toggleFullscreen,
	};
}
