import { useState, useRef, useCallback, useEffect } from "react";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseVideoSkipProps {
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	skipSeconds: number;
	duration: number;
}

interface VideoSkipState {
	predictedTime: number | null;
	skipQueue: number;
}

interface VideoSkipHandlers {
	skip: (seconds: number) => void;
	skipForward: () => void;
	skipBackward: () => void;
}

export function useVideoSkip({
	videoRef,
	skipSeconds,
	duration,
}: UseVideoSkipProps): VideoSkipState & VideoSkipHandlers {
	const skipThrottleRef = useRef<NodeJS.Timeout | null>(null);
	const skipQueueRef = useRef<number>(0);
	const [predictedTime, setPredictedTime] = useState<number | null>(null);

	// スキップ - 連続処理に対応（元のコードを復元）
	const skip = useCallback(
		(seconds: number) => {
			if (!videoRef.current) return;

			const currentTime = videoRef.current.currentTime;

			// 現在のキューに追加
			skipQueueRef.current += seconds;

			// 予測時間を更新
			const newPredictedTime = Math.max(
				0,
				Math.min(duration, currentTime + skipQueueRef.current),
			);
			setPredictedTime(newPredictedTime);

			// 既存のタイマーをクリア
			if (skipThrottleRef.current) {
				clearTimeout(skipThrottleRef.current);
			}

			// 500ms後に実際のスキップを実行
			skipThrottleRef.current = setTimeout(() => {
				if (!videoRef.current) return;

				const totalSkip = skipQueueRef.current;
				skipQueueRef.current = 0; // キューをリセット
				setPredictedTime(null); // 予測時間をリセット

				videoRef.current.currentTime = Math.max(
					0,
					Math.min(duration, currentTime + totalSkip),
				);
			}, 500);
		},
		[videoRef, duration],
	);

	const skipForward = useCallback(() => {
		skip(skipSeconds);
	}, [skip, skipSeconds]);

	const skipBackward = useCallback(() => {
		skip(-skipSeconds);
	}, [skip, skipSeconds]);

	// クリーンアップ処理
	useEffect(() => {
		return () => {
			if (skipThrottleRef.current) {
				clearTimeout(skipThrottleRef.current);
			}
			setPredictedTime(null);
			skipQueueRef.current = 0;
		};
	}, []);

	return {
		predictedTime,
		skipQueue: skipQueueRef.current,
		skip,
		skipForward,
		skipBackward,
	};
}
