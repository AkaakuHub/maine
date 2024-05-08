import React, { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";

import "./index.css";

import { Container } from "@mui/material";

import Control from "@/components/(parts)/VideoControl/";

import { VideoControlProps } from "@/type";

import formatTime from "@/libs/formatTime";

import OnProgressProps from "react-player";


type VideoProps = {
  parentDir: string;
  filename: string;
};

const Video: React.FC<VideoProps> = ({ parentDir, filename }) => {

  type videoStateType = {
    playing: boolean;
    muted: boolean;
    volume: number;
    played: number;
    seeking: boolean;
    buffer: boolean;
  };

  const [videoState, setVideoState] = useState<videoStateType>({
    playing: false,
    muted: false,
    volume: 0.5,
    played: 0,
    seeking: false,
    buffer: true
  });

  const videoPlayerRef = useRef<ReactPlayer>(null);
  const controlRef = useRef<HTMLDivElement>(null);

  let visibilityCount: number = 0;


  const playPauseHandler = () => {
    //plays and pause the video (toggling)
    // setVideoState({ ...videoState, playing: !videoState.playing });
    setVideoState((prevState) => {
      return { ...prevState, playing: !prevState.playing };
    });
  };

  const rewindHandler = () => {
    //Rewinds the video player reducing 5
    if (!videoPlayerRef.current) { return; }
    videoPlayerRef.current.seekTo(videoPlayerRef.current.getCurrentTime() - 5);
  };

  const fastForwardHandler = () => {
    //FastFowards the video player by adding 10
    if (!videoPlayerRef.current) { return; }
    videoPlayerRef.current.seekTo(videoPlayerRef.current.getCurrentTime() + 10);
  };

  const progressHandler: ((state: OnProgressProps) => void) = (state: OnProgressProps) => {
    if (!controlRef.current) { return; }
    if (visibilityCount > 3) {
      // toggling player control container
      controlRef.current.style.visibility = "hidden";
    } else if (controlRef.current.style.visibility === "visible") {
      visibilityCount += 1;
    }
    if (!videoState.seeking) {
      setVideoState({ ...videoState, ...state });
    }
  };

  const seekHandler: ((event: Event, value: number | number[], activeThumb: number) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; } // 型が怪しい
    setVideoState({ ...videoState, played: value / 100 });
  };

  const seekMouseUpHandler: ((e: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    if (!videoPlayerRef.current) { return; }
    setVideoState({ ...videoState, seeking: false });
    videoPlayerRef.current.seekTo(value / 100);
  };

  const volumeChangeHandler: ((e: Event, value: number | number[], activeThumb: number) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    const newVolume = value / 100;
    setVideoState({
      ...videoState,
      volume: newVolume,
      muted: Number(newVolume) === 0 ? true : false, // volume === 0 then muted
    })
  };

  const volumeSeekUpHandler: ((e: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    const newVolume = value / 100;
    setVideoState({
      ...videoState,
      volume: newVolume,
      muted: newVolume === 0 ? true : false,
    })
  };

  const muteHandler = () => {
    //Mutes the video player
    setVideoState({ ...videoState, muted: !videoState.muted });
  };

  const mouseMoveHandler = () => {
    if (!controlRef.current) { return; }
    controlRef.current.style.visibility = "visible";
    visibilityCount = 0;
  };

  const bufferStartHandler = () => {
    console.log("Bufering.......");
    setVideoState({ ...videoState, buffer: true })
  };

  const bufferEndHandler = () => {
    console.log("buffering stoped ,,,,,,play");
    setVideoState({ ...videoState, buffer: false })
  };

  const currentTime: number = videoPlayerRef.current ? videoPlayerRef.current.getCurrentTime() : 0;
  const duration: number = videoPlayerRef.current ? videoPlayerRef.current.getDuration() : 0;

  const formattedCurrentTime: string = formatTime(currentTime);
  const formattedDuration: string = formatTime(duration);

  const url = `/HLS/${parentDir}/${filename}/playlist.m3u8`;

  const ControlProp: VideoControlProps = {
    onPlayPause: playPauseHandler,
    playing: videoState.playing,
    onRewind: rewindHandler,
    onForward: fastForwardHandler,
    played: videoState.played,
    onSeek: seekHandler,
    onSeekMouseUp: seekMouseUpHandler,
    volume: videoState.volume,
    onVolumeChange: volumeChangeHandler,
    onVolumeSeekUp: volumeSeekUpHandler,
    muted: videoState.muted,
    onMute: muteHandler,
    duration: formattedDuration,
    currentTime: formattedCurrentTime,
    controlRef: controlRef
  }


  return (
    <div className="video_container">
      <Container maxWidth="md">
        <div className="player__wrapper">
          <div onMouseDown={mouseMoveHandler} >
            <ReactPlayer
              ref={videoPlayerRef}
              className="player"
              url={url}
              width="100%"
              height="100%"
              playing={videoState.playing}
              muted={videoState.muted}
              onProgress={progressHandler}
              volume={videoState.volume}
              onBuffer={bufferStartHandler}
              onBufferEnd={bufferEndHandler}
            />
            <Control {...ControlProp} />
          </div>
        </div>
      </Container>
      {videoState.buffer && <p>Loading</p>}
    </div>
  );
};

export default Video;
