import React, { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";

import "./index.css";

import Control from "@/components/(parts)/VideoControl/";

import { VideoControlProps } from "@/type";

import formatTime from "@/libs/formatTime";

type VideoProps = {
	parentDir: string;
	filename: string;
};

const Video: React.FC<VideoProps> = ({ parentDir, filename }) => {
	type videoStateType = {
		isPlaying: boolean;
		isMuted: boolean;
		volume: number;
		played: number;
		isSeeking: boolean;
		isBuffering: boolean;
		playbackRate: number;
		isFullScreen: boolean;
	};

	const [videoState, setVideoState] = useState<videoStateType>({
		isPlaying: true,
		isMuted: false,
		volume: 1.0,
		played: 0,
		isSeeking: false,
		isBuffering: true,
		playbackRate: 1.0,
		isFullScreen: false,
	});

	const [isPreviousPlaying, setIsPreviousPlaying] = useState<boolean>(false);
	const [duration, setDuration] = useState<number>(0);
	const [currentTime, setCurrentTime] = useState<number>(0);

	const videoPlayerRef = useRef<ReactPlayer>(null);
	const controlRef = useRef<HTMLDivElement>(null);
	const videoContainerRef = useRef<HTMLDivElement>(null);

	const [visibilityCount, setVisibilityCount] = useState<number>(0);
	const [hideControlsTimeout, setHideControlsTimeout] =
		useState<NodeJS.Timeout | null>(null);

	const playPauseHandler = () => {
		setVideoState({ ...videoState, isPlaying: !videoState.isPlaying });
	};

	const rewindHandler = () => {
		if (!videoPlayerRef.current) return;
		const newTime = Math.max(0, videoPlayerRef.current.getCurrentTime() - 5);
		videoPlayerRef.current.seekTo(newTime);
		setCurrentTime(newTime);
	};

	const fastForwardHandler = () => {
		if (!videoPlayerRef.current) return;
		const newTime = Math.min(
			duration,
			videoPlayerRef.current.getCurrentTime() + 10,
		);
		videoPlayerRef.current.seekTo(newTime);
		setCurrentTime(newTime);
	};

	const progressHandler = (state: any) => {
		setCurrentTime(state.playedSeconds);

		if (videoState.isSeeking) return;

		setVideoState({ ...videoState, played: state.played });

		if (hideControlsTimeout) {
			clearTimeout(hideControlsTimeout);
		}

		if (
			controlRef.current &&
			!controlRef.current.classList.contains("hidden")
		) {
			const timeout = setTimeout(() => {
				if (controlRef.current) {
					controlRef.current.classList.add("hidden");
				}
			}, 3000);
			setHideControlsTimeout(timeout);
		}
	};

	const seekHandler = (e: Event, value: number | number[]) => {
		if (!(typeof value === "number")) return;

		const played = value / 100;

		if (videoState.isPlaying) {
			setIsPreviousPlaying(true);
		}

		setVideoState((prevState) => ({
			...prevState,
			played,
			isSeeking: true,
		}));

		if (videoPlayerRef.current) {
			videoPlayerRef.current.seekTo(played, "fraction");
		}
	};

	const seekMouseUpHandler = (
		e: Event | React.SyntheticEvent<Element, Event>,
		value: number | number[],
	) => {
		if (!(typeof value === "number")) return;

		setVideoState((prevState) => ({
			...prevState,
			isSeeking: false,
			isPlaying: isPreviousPlaying,
		}));

		setIsPreviousPlaying(false);
	};

	const volumeChangeHandler = (e: Event, value: number | number[]) => {
		if (!(typeof value === "number")) return;

		const newVolume = value / 100;

		setVideoState({
			...videoState,
			volume: newVolume,
			isMuted: newVolume === 0,
		});
	};

	const volumeSeekUpHandler = (
		e: Event | React.SyntheticEvent<Element, Event>,
		value: number | number[],
	) => {
		if (!(typeof value === "number")) return;

		const newVolume = value / 100;

		setVideoState({
			...videoState,
			volume: newVolume,
			isMuted: newVolume === 0,
		});
	};

	const muteHandler = () => {
		setVideoState({ ...videoState, isMuted: !videoState.isMuted });
	};

	const mouseMoveHandler = () => {
		if (!controlRef.current) return;

		controlRef.current.classList.remove("hidden");
		setVisibilityCount(0);

		if (hideControlsTimeout) {
			clearTimeout(hideControlsTimeout);
		}

		const timeout = setTimeout(() => {
			if (controlRef.current && videoState.isPlaying) {
				controlRef.current.classList.add("hidden");
			}
		}, 3000);

		setHideControlsTimeout(timeout);
	};

	const bufferStartHandler = () => {
		setVideoState({ ...videoState, isBuffering: true });
	};

	const bufferEndHandler = () => {
		setVideoState({ ...videoState, isBuffering: false });
	};

	const durationChangeHandler = (duration: number) => {
		setDuration(duration);
	};

	const formattedCurrentTime: string = formatTime(currentTime);
	const formattedDuration: string = formatTime(duration);

	useEffect(() => {
		if (videoState.isPlaying && currentTime >= duration && duration > 0) {
			setVideoState({ ...videoState, isPlaying: false });
		}
	}, [currentTime, duration, videoState]);

	useEffect(() => {
		// Cleanup function to clear timeout when component unmounts
		return () => {
			if (hideControlsTimeout) {
				clearTimeout(hideControlsTimeout);
			}
		};
	}, [hideControlsTimeout]);

	const toggleFullscreen = () => {
		if (!videoContainerRef.current) return;

		if (document.fullscreenElement) {
			document.exitFullscreen().catch((err) => console.error(err));
			setVideoState({ ...videoState, isFullScreen: false });
		} else {
			videoContainerRef.current
				.requestFullscreen()
				.catch((err) => console.error(err));
			setVideoState({ ...videoState, isFullScreen: true });
		}
	};

	const togglePictureInPicture = async () => {
		if (!videoPlayerRef.current) return;

		try {
			const internalPlayer = videoPlayerRef.current.getInternalPlayer();

			// Check if already in PiP mode
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else if (
				internalPlayer &&
				"requestPictureInPicture" in internalPlayer
			) {
				// iOS Safari check and specific handling
				if (
					navigator.userAgent.match(/iPad|iPhone|iPod/) &&
					navigator.userAgent.match(/WebKit/) &&
					!navigator.userAgent.match(/CriOS/)
				) {
					// On iOS, we need to use the webkitSetPresentationMode if available
					if (internalPlayer.webkitSetPresentationMode) {
						internalPlayer.webkitSetPresentationMode("picture-in-picture");
					} else {
						await internalPlayer.requestPictureInPicture();
					}
				} else {
					await internalPlayer.requestPictureInPicture();
				}
			}
		} catch (error) {
			console.error("Failed to toggle picture-in-picture mode:", error);
		}
	};

	const changePlaybackRate = (rate: number) => {
		setVideoState({ ...videoState, playbackRate: rate });
	};

	const url = `/api/getVideo?filePath=${parentDir}/${filename}`;

	const keyDownHandler = (e: KeyboardEvent) => {
		if (e.key === " " || e.key === "k") {
			e.preventDefault();
			playPauseHandler();
		} else if (e.key === "j") {
			rewindHandler();
		} else if (e.key === "l") {
			fastForwardHandler();
		} else if (e.key === "f") {
			toggleFullscreen();
		} else if (e.key === "m") {
			muteHandler();
		}
	};

	useEffect(() => {
		document.addEventListener("keydown", keyDownHandler);
		return () => {
			document.removeEventListener("keydown", keyDownHandler);
		};
	}, [videoState.isPlaying]);

	const ControlProp: VideoControlProps = {
		onPlayPause: playPauseHandler,
		isPlaying: videoState.isPlaying,
		onRewind: rewindHandler,
		onForward: fastForwardHandler,
		played: videoState.played,
		onSeek: seekHandler,
		onSeekMouseUp: seekMouseUpHandler,
		volume: videoState.volume,
		onVolumeChange: volumeChangeHandler,
		onVolumeSeekUp: volumeSeekUpHandler,
		isMuted: videoState.isMuted,
		onMute: muteHandler,
		duration: formattedDuration,
		currentTime: formattedCurrentTime,
		controlRef: controlRef,
		onToggleFullscreen: toggleFullscreen,
		onTogglePictureInPicture: togglePictureInPicture,
		onChangePlaybackRate: changePlaybackRate,
		isFullScreen: videoState.isFullScreen,
	};

	return (
		<div className="video_container" ref={videoContainerRef}>
			<div className="player__wrapper">
				<div>
					<div
						className="video_player_area"
						onClick={playPauseHandler}
						onMouseMove={mouseMoveHandler}
						onDoubleClick={toggleFullscreen}
					>
						<ReactPlayer
							ref={videoPlayerRef}
							className="player"
							url={url}
							width="100%"
							height="100%"
							playing={videoState.isPlaying}
							muted={videoState.isMuted}
							onProgress={progressHandler}
							volume={videoState.volume}
							onBuffer={bufferStartHandler}
							onBufferEnd={bufferEndHandler}
							playbackRate={videoState.playbackRate}
							onDuration={durationChangeHandler}
						/>
					</div>
					<Control {...ControlProp} />
				</div>
			</div>
			{videoState.isBuffering && (
				<div className="buffering-indicator">Loading...</div>
			)}
		</div>
	);
};

export default Video;
