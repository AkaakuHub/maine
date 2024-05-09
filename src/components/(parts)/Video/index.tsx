import React, { useEffect, useState, useRef, use } from "react";
import ReactPlayer from "react-player";

import "./index.css";

import { Container } from "@mui/material";

import Control from "@/components/(parts)/VideoControl/";

import { VideoControlProps } from "@/type";

import formatTime from "@/libs/formatTime";

// import OnProgressProps from "react-player";

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

  const [isPreviousPlying, setIsPreviousPlying] = useState<boolean>(false);

  const videoPlayerRef = useRef<ReactPlayer>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [visibilityCount, setVisibilityCount] = useState<number>(0);

  const playPauseHandler = () => {
    //plays and pause the video (toggling)
    setVideoState({ ...videoState, isPlaying: !videoState.isPlaying });
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

  const progressHandler: ((state: any) => void) = (state: any) => {
    if (!controlRef.current) { return; }
    if (visibilityCount > 1) {
      controlRef.current.classList.add("hidden");
    } else if (!controlRef.current.classList.contains("hidden")) {
      setVisibilityCount(visibilityCount + 1);
    }
    if (!videoState.isSeeking) {
      setVideoState({ ...videoState, ...state });
    }
  };

  const seekHandler: ((event: Event, value: number | number[], activeThumb: number) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    const played: number = value / 100;
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(played, "fraction");
    }
    if (videoState.isPlaying) { setIsPreviousPlying(true); } // 途中でシークした場合、再生中だったら、再生中のままにする
    setVideoState((prevState) => ({ ...prevState, played: played, isPlaying: false }));
  };

  const seekMouseUpHandler: ((e: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    if (!videoPlayerRef.current) { return; }
    // videoPlayerRef.current.seekTo(value / 100);
    setVideoState((prevState) => ({ ...prevState, played: value / 100, isSeeking: false, isPlaying: isPreviousPlying }));
    setIsPreviousPlying(false);
  };


  const volumeChangeHandler: ((e: Event, value: number | number[], activeThumb: number) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    const newVolume = value / 100;
    setVideoState({
      ...videoState,
      volume: newVolume,
      isMuted: Number(newVolume) === 0 ? true : false, // volume === 0 then isMuted
    })
  };

  const volumeSeekUpHandler: ((e: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => void) = (e, value) => {
    if (!(typeof value === "number")) { return; }
    const newVolume = value / 100;
    setVideoState({
      ...videoState,
      volume: newVolume,
      isMuted: newVolume === 0 ? true : false,
    })
  };

  const muteHandler = () => {
    setVideoState({ ...videoState, isMuted: !videoState.isMuted });
  };

  const mouseMoveHandler = () => {
    if (!controlRef.current) { return; }
    controlRef.current.classList.remove("hidden");
    setVisibilityCount(0);
  };

  const bufferStartHandler = () => {
    setVideoState({ ...videoState, isBuffering: true })
  };

  const bufferEndHandler = () => {
    setVideoState({ ...videoState, isBuffering: false })
  };

  const currentTime: number = videoPlayerRef.current ? videoPlayerRef.current.getCurrentTime() : 0;
  const duration: number = videoPlayerRef.current ? videoPlayerRef.current.getDuration() : 0;

  const formattedCurrentTime: string = formatTime(currentTime);
  const formattedDuration: string = formatTime(duration);

  // useEffectで、playingを監視する、currentTime, durationで、最後まで行ったらplayingをfalseにする
  useEffect(() => {
    if (videoState.isPlaying && currentTime === duration) {
      setVideoState({ ...videoState, isPlaying: false });
    }
  }, [currentTime, duration]);

  const toggleFullscreen = () => {
    if (videoContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setVideoState({ ...videoState, isFullScreen: false });
      } else {
        videoContainerRef.current.requestFullscreen();
        setVideoState({ ...videoState, isFullScreen: true });
      }
    }
  };


  const togglePictureInPicture = async () => {
    // ピクチャ・イン・ピクチャへの切り替え
    if (videoPlayerRef.current) {
      const internalPlayer: any = videoPlayerRef.current.getInternalPlayer();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else {
        internalPlayer.requestPictureInPicture();
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    // 再生速度の切り替え
    setVideoState({ ...videoState, playbackRate: rate });
  };


  const url = `/HLS/${parentDir}/${filename}/playlist.m3u8`;

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
  }

  // キーボード設定
  // スペースキー, Kで再生・一時停止
  // J, Lキーで巻き戻し・早送り
  // Fキーでフルスクリーン
  // Mキーでミュート
  // useEffect(() => {
  //   const keyDownHandler = (e: KeyboardEvent) => {
  //     if (e.key === " ") {
  //       playPauseHandler();
  //     } else if (e.key === "k") {
  //       playPauseHandler();
  //     } else if (e.key === "j") {
  //       rewindHandler();
  //     } else if (e.key === "l") {
  //       fastForwardHandler();
  //     } else if (e.key === "f") {
  //       toggleFullscreen();
  //     } else if (e.key === "m") {
  //       muteHandler();
  //     }
  //   };
  //   document.addEventListener("keydown", keyDownHandler);
  //   return () => {
  //     document.removeEventListener("keydown", keyDownHandler);
  //   };
  // }, []);


  return (
    <div className="video_container" ref={videoContainerRef}
    >
      {/* <Container maxWidth="md"> */}
      <div className="player__wrapper">
        <div
        // onMouseDown={mouseMoveHandler}
        // ここの階層がうまくいってない
        >

          <div
            onClick={() => {
              playPauseHandler();
              mouseMoveHandler();
            }}
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
            />
          </div>
          <Control {...ControlProp} />
        </div>
      </div>
      {/* </Container > */}
      {videoState.isBuffering && <p>Buffering</p>}
    </div >
  );
};

export default Video;
