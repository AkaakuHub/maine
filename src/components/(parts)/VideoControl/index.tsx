import React, { Dispatch } from "react";
import { Slider, Button, Tooltip, Popover, Grid } from "@mui/material";
import { FastForward, FastRewind, Pause, PlayArrow, SkipNext, VolumeUp, VolumeOff, Fullscreen, FullscreenExit, PictureInPicture } from "@mui/icons-material";
import styled from '@emotion/styled';

import { VideoControlProps } from "@/type";

import "./index.css";


// styledを使わないとMUIは変更できない
const VolumeSlider = styled(Slider)({
  width: "100px",
  color: "#9556CC",
});

const BottomIcons = styled('div')({
  color: "#999",
  padding: "12px 8px",
  "&:hover": {
    color: "#fff",
  },
});

const PrettoSlider = styled(Slider)({
  height: "20px",
  color: "#9556CC",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  "& .MuiSlider-thumb": {
    height: 20,
    width: 20,
    backgroundColor: "#9556CC",
    border: "2px solid currentColor",
    marginTop: -3,
    marginLeft: -12,
    "&:focus, &:hover, &$active": {
      boxShadow: "inherit",
    },
  },
  "& .MuiSlider-active": {},
  "& .MuiSlider-valueLabel": {
    left: "calc(-50% + 4px)",
  },
  "& .MuiSlider-track": {
    height: 5,
    borderRadius: 4,
    width: "100%",
  },
  "& .MuiSlider-rail": {
    height: 5,
    borderRadius: 4,
  },
});

const Control: React.FC<VideoControlProps> = (
  {
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
  }
) => {
  return (
    <div className="control_Container" ref={controlRef}>
      <div className="top_container">
      </div>
      <div className="mid__container">
        {/* <div className="icon__btn" onDoubleClick={onRewind}>
          <FastRewind fontSize="medium" />
        </div>

        <div className="icon__btn" onClick={onPlayPause}>
          {isPlaying ? (
            <Pause fontSize="medium" />
          ) : (
            <PlayArrow fontSize="medium" />
          )}{" "}
        </div>

        <div className="icon__btn">
          <FastForward fontSize="medium" onDoubleClick={onForward} />
        </div> */}
      </div>
      <div className="bottom__container">
        <div className="slider__container">
          <PrettoSlider
            min={0}
            max={100}
            value={played * 100}
            onChange={onSeek}
            onChangeCommitted={onSeekMouseUp}
          />
        </div>
        <div className="control__box">
          <div className="inner__controls">
            <div className="icon__btn" onClick={onPlayPause}>
              {isPlaying ? (
                <Pause fontSize="medium" />
              ) : (
                <PlayArrow fontSize="medium" />
              )}{" "}
            </div>
            <div className="icon__btn" onClick={onMute} >
              {isMuted ? (
                <VolumeOff fontSize="medium" />
              ) : (
                <VolumeUp fontSize="medium" />
              )}
            </div>
            <VolumeSlider
              value={!isMuted ? volume * 100 : 0}
              onChange={onVolumeChange}
              onChangeCommitted={onVolumeSeekUp}
            />
            <span>{currentTime} : {duration}</span>
            <div className="icon__btn" onClick={onToggleFullscreen}>
              {isFullScreen ? (
                <FullscreenExit fontSize="medium" />
              ) : (
                <Fullscreen fontSize="medium" />
              )
              }
            </div>
            <div className="icon__btn" onClick={onTogglePictureInPicture}>
              <PictureInPicture fontSize="medium" />
            </div>
            <div className="icon__btn" onClick={() => onChangePlaybackRate(1.0)}>
              <span>1x</span>
            </div>
            <div className="icon__btn" onClick={() => onChangePlaybackRate(1.5)}>
              <span>1.5x</span>
            </div>
            <div className="icon__btn" onClick={() => onChangePlaybackRate(2.0)}>
              <span>2x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Control;
