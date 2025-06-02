"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipBack, 
  SkipForward,
  Settings,
  PictureInPicture2,
  ArrowLeft,
  MoreHorizontal
} from "lucide-react";
import { cn, formatDuration } from "@/libs/utils";

interface ModernVideoPlayerProps {
  src: string;
  title?: string;
  onBack?: () => void;
  className?: string;
}

const ModernVideoPlayer = ({ src, title, onBack, className = "" }: ModernVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

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
  }, []);

  // 音量変更
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  // ミュート切り替え
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // フルスクリーン切り替え
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  // シーク
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = Number.parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // 再生速度変更
  const handlePlaybackRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  // スキップ
  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  }, [duration, currentTime]);

  // ピクチャーインピクチャー
  const togglePictureInPicture = async () => {
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
  };

  // コントロール表示制御
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [togglePlay, skip, toggleFullscreen, toggleMute]);

  // ビデオイベントハンドラー
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleLoadStart = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  // マウス移動でコントロール表示
  useEffect(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen && "!rounded-none",
        className
      )}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* ビデオ要素 */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onClick={togglePlay}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePlay();
          }
        }}
        preload="metadata"
        tabIndex={0}
        aria-label={`動画: ${title || '無題'}`}
      >
        <track kind="captions" srcLang="ja" label="日本語字幕" />
      </video>

      {/* バッファリング表示 */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 再生ボタンオーバーレイ */}
      <button 
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity border-0 w-full h-full",
          !isPlaying && !isBuffering ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={togglePlay}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePlay();
          }
        }}
        aria-label="動画を再生"
        type="button"
      >
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 hover:bg-white/30 transition-colors">
          <Play className="h-16 w-16 text-white ml-2" />
        </div>
      </button>

      {/* コントロール */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 p-4",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {/* 上部: タイトルと戻るボタン */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
            {title && (
              <h1 className="text-white font-semibold text-lg truncate max-w-md">
                {title}
              </h1>
            )}
          </div>
          <button
            type="button"
            className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="mb-3">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* 下部コントロール */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            
            <button type="button" onClick={() => skip(-10)} className="text-white hover:text-blue-400 transition-colors">
              <SkipBack className="h-5 w-5" />
            </button>
            
            <button type="button" onClick={() => skip(10)} className="text-white hover:text-blue-400 transition-colors">
              <SkipForward className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <span className="text-white text-sm font-mono">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 設定メニュー */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-8 right-0 bg-black/90 backdrop-blur-sm rounded-lg p-3 min-w-32">
                  <div className="text-white text-sm mb-2">再生速度</div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={cn(
                        "block w-full text-left px-2 py-1 text-sm rounded transition-colors",
                        playbackRate === rate ? "bg-blue-500 text-white" : "text-gray-300 hover:bg-white/10"
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={togglePictureInPicture} className="text-white hover:text-blue-400 transition-colors">
              <PictureInPicture2 className="h-5 w-5" />
            </button>

            <button type="button" onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* カスタムスライダースタイル */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ModernVideoPlayer;
