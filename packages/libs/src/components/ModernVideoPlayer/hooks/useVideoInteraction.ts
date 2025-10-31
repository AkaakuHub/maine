import { useState, useCallback } from "react";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseVideoInteractionProps {
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	skipForward: () => void;
	skipBackward: () => void;
	enableDoubleTap?: boolean;
}

interface VideoInteractionState {
	lastTapTime: number;
}

interface VideoInteractionHandlers {
	handleVideoTap: (e: React.MouseEvent<HTMLVideoElement>) => boolean;
	togglePictureInPicture: () => Promise<void>;
}

export function useVideoInteraction({
	videoRef,
	skipForward,
	skipBackward,
	enableDoubleTap = true,
}: UseVideoInteractionProps): VideoInteractionState & VideoInteractionHandlers {
	const [lastTapTime, setLastTapTime] = useState(0);
	const [lastTapX, setLastTapX] = useState(0);

	// ダブルタップ機能
	const handleVideoTap = useCallback(
		(e: React.MouseEvent<HTMLVideoElement>) => {
			const currentTime = Date.now();
			const tapX = e.clientX;
			const videoWidth = e.currentTarget.clientWidth;
			const tapPosition = tapX / videoWidth; // 0-1の範囲

			if (enableDoubleTap) {
				// ダブルタップの判定（500ms以内、同じ位置付近）
				if (currentTime - lastTapTime < 500 && Math.abs(tapX - lastTapX) < 50) {
					e.stopPropagation(); // 通常の再生/一時停止を防ぐ

					if (tapPosition > 0.6) {
						// 右側タップ: 前進
						skipForward();
					} else if (tapPosition < 0.4) {
						// 左側タップ: 後退
						skipBackward();
					}

					// ダブルタップ処理後はlastTapTimeをリセット
					setLastTapTime(0);
					return true;
				}
				setLastTapTime(currentTime);
				setLastTapX(tapX);
				return false;
			}
			setLastTapTime(currentTime);
			setLastTapX(tapX);
			return false;
		},
		[lastTapTime, lastTapX, skipForward, skipBackward, enableDoubleTap],
	);

	// ピクチャーインピクチャー
	const togglePictureInPicture = useCallback(async () => {
		if (!videoRef.current) return;

		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else {
				await videoRef.current.requestPictureInPicture();
			}
		} catch (error) {
			console.error("Picture-in-picture error:", error);
		}
	}, [videoRef]);

	return {
		lastTapTime,
		handleVideoTap,
		togglePictureInPicture,
	};
}
