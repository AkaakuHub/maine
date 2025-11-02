import { useCallback, useEffect, useState } from "react";
import type { HTMLVideoElementWithFullscreen } from "../types";

interface UseVideoElementProps {
	videoRef: React.RefObject<HTMLVideoElementWithFullscreen | null>;
	initialTime: number;
	volume: number;
	playbackRate: number;
	isMuted: boolean;
	onTimeUpdate?: (currentTime: number, duration: number) => void;
}

interface VideoElementState {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	isBuffering: boolean;
	isSeeking: boolean;
	togglePlay: () => void;
	handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleSeekStart: () => void;
	handleSeekEnd: (time: number) => void;
	getSeekStep: () => number;
}

export function useVideoElement({
	videoRef,
	initialTime,
	volume,
	playbackRate,
	isMuted,
	onTimeUpdate,
}: UseVideoElementProps): VideoElementState {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isBuffering, setIsBuffering] = useState(false);
	const [isSeeking, setIsSeeking] = useState(false);
	const [wasPlayingBeforeSeek, setWasPlayingBeforeSeek] = useState(false);

	// 再生/一時停止
	const togglePlay = useCallback(() => {
		if (!videoRef.current) return;

		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	}, [videoRef]);

	// シーク開始
	const handleSeekStart = useCallback(() => {
		if (!videoRef.current) return;

		setIsSeeking(true);
		// 再生中だった場合、一時停止して黒い暗転を防ぐ
		if (isPlaying) {
			setWasPlayingBeforeSeek(true);
			videoRef.current.pause();
		} else {
			setWasPlayingBeforeSeek(false);
		}
	}, [videoRef, isPlaying]);

	// シーク中（プレビュー表示のみ）
	const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const time = Number.parseFloat(e.target.value);
		// シーク中は表示用の時間だけ更新
		setCurrentTime(time);
	}, []);

	// シーク終了（実際の動画位置を更新）
	const handleSeekEnd = useCallback(
		(time: number) => {
			if (!videoRef.current) return;

			// 実際に動画の再生位置を更新
			videoRef.current.currentTime = time;
			setIsSeeking(false);

			// シーク前に再生していた場合は再開
			if (wasPlayingBeforeSeek) {
				videoRef.current.play().catch(() => {
					// ブラウザの自動再生ポリシーにより失敗する場合があります
				});
				setWasPlayingBeforeSeek(false);
			}
		},
		[videoRef, wasPlayingBeforeSeek],
	);

	// 動画の長さに応じてシークバーのstep値を計算
	const getSeekStep = useCallback(() => {
		if (duration === 0) return 0.01;

		if (duration <= 10) return 0.01;
		if (duration <= 30) return 0.1;
		if (duration <= 60) return 0.25;
		if (duration <= 300) return 0.5;
		if (duration <= 600) return 1;
		if (duration <= 1800) return 2;
		return 5;
	}, [duration]);

	// ビデオイベントリスナーの設定
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleTimeUpdate = () => {
			const current = video.currentTime;
			// シーク中以外は現在時刻を更新
			if (!isSeeking) {
				setCurrentTime(current);
			}

			if (current >= video.duration) {
				setIsPlaying(false);
				video.pause();
			}

			if (onTimeUpdate && video.duration) {
				onTimeUpdate(current, video.duration);
			}
		};

		const handleLoadedMetadata = () => {
			setDuration(video.duration);

			if (initialTime > 0 && initialTime < video.duration) {
				video.currentTime = initialTime;
			}

			video.playbackRate = playbackRate;
			video.volume = isMuted ? 0 : volume;

			video
				.play()
				.then(() => {
					setIsPlaying(true);
				})
				.catch(() => {
					// ブラウザの自動再生ポリシーにより失敗する場合があります
				});
		};

		const handleWaiting = () => setIsBuffering(true);
		const handleCanPlay = () => setIsBuffering(false);

		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		video.addEventListener("waiting", handleWaiting);
		video.addEventListener("canplay", handleCanPlay);

		return () => {
			video.removeEventListener("timeupdate", handleTimeUpdate);
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			video.removeEventListener("waiting", handleWaiting);
			video.removeEventListener("canplay", handleCanPlay);
		};
	}, [
		videoRef,
		onTimeUpdate,
		initialTime,
		playbackRate,
		volume,
		isMuted,
		isSeeking,
	]);

	return {
		isPlaying,
		currentTime,
		duration,
		isBuffering,
		isSeeking,
		togglePlay,
		handleSeek,
		handleSeekStart,
		handleSeekEnd,
		getSeekStep,
	};
}
