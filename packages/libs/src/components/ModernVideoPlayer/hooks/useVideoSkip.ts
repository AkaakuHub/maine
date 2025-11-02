import { useCallback, useEffect, useRef, useState } from "react";
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

			// 300ms後に実際のスキップを実行（レスポンシブに）
			skipThrottleRef.current = setTimeout(() => {
				if (!videoRef.current) return;

				// タイマー実行時の最新の現在時刻を取得
				const currentVideoTime = videoRef.current.currentTime;
				const totalSkip = skipQueueRef.current;

				// 新しい時刻を計算（黒いフレームを避けるため微小な調整）
				let newTime = Math.max(
					0,
					Math.min(duration, currentVideoTime + totalSkip),
				);

				// 0秒付近の黒いフレームを避ける（30fps想定で1フレーム分調整）
				if (newTime < 0.034) {
					newTime = 0.034;
				}

				// キューをリセット
				skipQueueRef.current = 0;
				setPredictedTime(null);

				// Pause-Seek-Play パターンで暗転を防ぐ
				const video = videoRef.current;
				if (video) {
					const wasPlaying = !video.paused;

					// 一時停止してからシーク
					video.pause();

					// seekedイベントを待ってから再生再開
					const handleSeeked = () => {
						video.removeEventListener("seeked", handleSeeked);
						if (wasPlaying) {
							video.play().catch(() => {
								// 再生失敗を無視
							});
						}
					};

					video.addEventListener("seeked", handleSeeked, { once: true });
					video.currentTime = newTime;
				}
			}, 300);
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
