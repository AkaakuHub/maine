import { useState, useCallback } from "react";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseVideoInteractionProps {
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	skipForward: () => void;
	skipBackward: () => void;
	enableDoubleTap?: boolean;
	onControlToggle?: (show: boolean) => void;
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
	onControlToggle,
}: UseVideoInteractionProps): VideoInteractionState & VideoInteractionHandlers {
	const [lastTapTime, setLastTapTime] = useState(0);
	const [lastTapX, setLastTapX] = useState(0);
	const [lastDoubleTapTime, setLastDoubleTapTime] = useState(0);

	// YouTube風ダブルタップ機能
	const handleVideoTap = useCallback(
		(e: React.MouseEvent<HTMLVideoElement>) => {
			const currentTime = Date.now();
			const tapX = e.clientX;
			const videoWidth = e.currentTarget.clientWidth;
			const tapPosition = tapX / videoWidth; // 0-1の範囲

			if (enableDoubleTap) {
				// ダブルタップの判定（300ms以内、同じ位置付近）
				if (currentTime - lastTapTime < 300 && Math.abs(tapX - lastTapX) < 50) {
					e.stopPropagation(); // 通常の再生/一時停止を防ぐ

					// 連続ダブルタップ判定
					const isConsecutiveDoubleTap = currentTime - lastDoubleTapTime < 1000;

					// 連続ダブルタップでなければコントロール非表示
					if (!isConsecutiveDoubleTap && onControlToggle) {
						onControlToggle(false);
					}

					if (tapPosition > 0.6) {
						// 右側タップ: 前進
						skipForward();
					} else if (tapPosition < 0.4) {
						// 左側タップ: 後退
						skipBackward();
					}

					// ダブルタップ処理後は時刻を更新（リセットしない）
					setLastTapTime(currentTime);
					setLastDoubleTapTime(currentTime);
					return true;
				}

				// 1回目のタップ：常にコントロールを表示
				if (onControlToggle) {
					onControlToggle(true);
				}

				setLastTapTime(currentTime);
				setLastTapX(tapX);
				return false;
			}

			// ダブルタップ無効時は常にコントロール表示
			if (onControlToggle) {
				onControlToggle(true);
			}

			setLastTapTime(currentTime);
			setLastTapX(tapX);
			return false;
		},
		[
			lastTapTime,
			lastTapX,
			lastDoubleTapTime,
			skipForward,
			skipBackward,
			enableDoubleTap,
			onControlToggle,
		],
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
