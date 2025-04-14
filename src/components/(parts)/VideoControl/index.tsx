import React from "react";
import { Slider } from "@mui/material";
import {
	FastForward,
	FastRewind,
	Pause,
	PlayArrow,
	VolumeUp,
	VolumeOff,
	Fullscreen,
	FullscreenExit,
	PictureInPicture,
} from "@mui/icons-material";
import styled from "@emotion/styled";

import { VideoControlProps } from "@/type";

import "./index.css";

// Styled volume slider
const VolumeSlider = styled(Slider)({
	width: "100px",
	color: "#9556CC",
	"& .MuiSlider-track": {
		height: 4,
	},
	"& .MuiSlider-thumb": {
		width: 14,
		height: 14,
		transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
		"&:before": {
			boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
		},
		"&:hover, &.Mui-focusVisible": {
			boxShadow: "0px 0px 0px 8px rgb(0 0 0 / 16%)",
		},
		"&.Mui-active": {
			width: 20,
			height: 20,
		},
	},
	"& .MuiSlider-rail": {
		opacity: 0.28,
	},
});

// Styled seek slider
const PrettoSlider = styled(Slider)({
	color: "#9556CC",
	height: 8,
	"& .MuiSlider-track": {
		border: "none",
		height: 8,
	},
	"& .MuiSlider-thumb": {
		height: 18,
		width: 18,
		backgroundColor: "#fff",
		border: "2px solid currentColor",
		"&:focus, &:hover, &.Mui-active": {
			boxShadow: "0 0 0 8px rgba(149, 86, 204, 0.16)",
		},
		"&:before": {
			display: "none",
		},
	},
	"& .MuiSlider-rail": {
		opacity: 0.5,
		backgroundColor: "#bfbfbf",
		height: 8,
	},
});

const Control: React.FC<VideoControlProps> = ({
	onPlayPause,
	isPlaying,
	onRewind,
	onForward,
	played,
	onSeek,
	onSeekMouseUp,
	volume,
	onVolumeChange,
	onVolumeSeekUp,
	isMuted,
	onMute,
	duration,
	currentTime,
	controlRef,
	onToggleFullscreen,
	onTogglePictureInPicture,
	onChangePlaybackRate,
	isFullScreen,
}) => {
	const handlePlaybackRateChange = (rate: number) => (e: React.MouseEvent) => {
		e.stopPropagation();
		onChangePlaybackRate(rate);
	};

	const handleControlClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	return (
		<div
			className="control_Container"
			ref={controlRef}
			onClick={handleControlClick}
		>
			<div className="top_container"></div>

			<div className="mid__container">
				<div
					className="icon__btn"
					onClick={(e) => {
						e.stopPropagation();
						onRewind();
					}}
				>
					<FastRewind fontSize="medium" />
				</div>

				<div
					className="icon__btn"
					onClick={(e) => {
						e.stopPropagation();
						onPlayPause();
					}}
				>
					{isPlaying ? (
						<Pause fontSize="large" />
					) : (
						<PlayArrow fontSize="large" />
					)}
				</div>

				<div
					className="icon__btn"
					onClick={(e) => {
						e.stopPropagation();
						onForward();
					}}
				>
					<FastForward fontSize="medium" />
				</div>
			</div>

			<div className="bottom__container">
				<div className="slider__container">
					<PrettoSlider
						min={0}
						max={100}
						value={played * 100}
						onChange={onSeek}
						onChangeCommitted={onSeekMouseUp}
						aria-label="Video progress"
					/>
				</div>

				<div className="control__box">
					<div className="inner__controls">
						<div
							className="icon__btn"
							onClick={(e) => {
								e.stopPropagation();
								onPlayPause();
							}}
						>
							{isPlaying ? (
								<Pause fontSize="medium" />
							) : (
								<PlayArrow fontSize="medium" />
							)}
						</div>

						<div
							className="icon__btn"
							onClick={(e) => {
								e.stopPropagation();
								onMute();
							}}
						>
							{isMuted ? (
								<VolumeOff fontSize="medium" />
							) : (
								<VolumeUp fontSize="medium" />
							)}
						</div>

						<div className="volume-slider-container">
							<VolumeSlider
								value={!isMuted ? volume * 100 : 0}
								onChange={onVolumeChange}
								onChangeCommitted={onVolumeSeekUp}
								aria-label="Volume"
							/>
						</div>

						<span className="time-display">
							{currentTime} / {duration}
						</span>

						<div className="playback-controls">
							<div
								className="icon__btn playback-rate"
								onClick={handlePlaybackRateChange(1.0)}
							>
								<span>1x</span>
							</div>

							<div
								className="icon__btn playback-rate"
								onClick={handlePlaybackRateChange(1.5)}
							>
								<span>1.5x</span>
							</div>

							<div
								className="icon__btn playback-rate"
								onClick={handlePlaybackRateChange(2.0)}
							>
								<span>2x</span>
							</div>
						</div>

						<div
							className="icon__btn"
							onClick={(e) => {
								e.stopPropagation();
								onTogglePictureInPicture();
							}}
						>
							<PictureInPicture fontSize="medium" />
						</div>

						<div
							className="icon__btn"
							onClick={(e) => {
								e.stopPropagation();
								onToggleFullscreen();
							}}
						>
							{isFullScreen ? (
								<FullscreenExit fontSize="medium" />
							) : (
								<Fullscreen fontSize="medium" />
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Control;
