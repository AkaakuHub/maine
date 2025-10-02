import { useState, useEffect, useCallback } from "react";
import type {
	HTMLElementWithFullscreen,
	DocumentWithFullscreen,
} from "../types";

interface UseVideoFullscreenProps {
	containerRef: React.RefObject<HTMLDivElement | null>;
}

interface VideoFullscreenState {
	isFullscreen: boolean;
}

interface VideoFullscreenHandlers {
	toggleFullscreen: () => Promise<void>;
}

export function useVideoFullscreen({
	containerRef,
}: UseVideoFullscreenProps): VideoFullscreenState & VideoFullscreenHandlers {
	const [isFullscreen, setIsFullscreen] = useState(false);

	// フルスクリーン切り替え - ブラウザ間互換性を考慮
	const toggleFullscreen = useCallback(async () => {
		if (!containerRef.current) return;

		const doc = document as DocumentWithFullscreen;
		const container = containerRef.current as HTMLElementWithFullscreen;

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
				// フルスクリーン開始
				if (container.requestFullscreen) {
					await container.requestFullscreen();
				} else if (container.webkitRequestFullscreen) {
					await container.webkitRequestFullscreen();
				} else if (container.mozRequestFullScreen) {
					await container.mozRequestFullScreen();
				} else if (container.msRequestFullscreen) {
					await container.msRequestFullscreen();
				}
			}
		} catch (error) {
			console.error("Fullscreen error:", error);
		}
	}, [containerRef]);

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
