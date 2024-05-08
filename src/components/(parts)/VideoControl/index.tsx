import React, { Dispatch } from "react";
import { Slider, Button, Tooltip, Popover, Grid } from "@mui/material";
import { FastForward, FastRewind, Pause, PlayArrow, SkipNext, VolumeUp, VolumeOff } from "@mui/icons-material";
import styled from '@emotion/styled';

import { VideoControlProps } from "@/type";

import "./index.css";

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
    playing,
    onRewind,
    onForward,
    played,
    onSeek,
    onSeekMouseUp,
    volume,
    onVolumeChange,
    onVolumeSeekUp,
    muted,
    onMute,
    duration,
    currentTime,
    controlRef,
  }
) => {
  return (
    <div className="control_Container" ref={controlRef}>
      <div className="top_container">
        <h2>Video PLayer</h2>
      </div>
      <div className="mid__container">
        <div className="icon__btn" onDoubleClick={onRewind}>
          <FastRewind fontSize="medium" />
        </div>

        <div className="icon__btn" onClick={onPlayPause}>
          {playing ? (
            <Pause fontSize="medium" />
          ) : (
            <PlayArrow fontSize="medium" />
          )}{" "}
        </div>

        <div className="icon__btn">
          <FastForward fontSize="medium" onDoubleClick={onForward} />
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
          />
        </div>
        <div className="control__box">
          <div className="inner__controls">
            {/* <div className="icon__btn">
              <PlayArrow fontSize="medium" />
            </div> */}
            {/* <div className="icon__btn">
              <SkipNext fontSize="medium" />
            </div> */}
            <div className="icon__btn" onClick={onMute} >
              {muted ? (
                <VolumeOff fontSize="medium" />
              ) : (
                <VolumeUp fontSize="medium" />
              )}
            </div>

            <VolumeSlider
              value={volume * 100}
              onChange={onVolumeChange}
              onChangeCommitted={onVolumeSeekUp}
            />
            <span>{currentTime} : {duration}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Control;
