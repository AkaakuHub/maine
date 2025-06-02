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
  PictureInPicture2
} from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

const VideoPlayer = ({ src, title, className = "" }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

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
    }
    setIsMuted(newVolume === 0);
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

  // シーク
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // スキップ
  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  }, []);

  // フルスクリーン
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, [isFullscreen]);

  // Picture in Picture
  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PIP error:', error);
    }
  };

  // 再生速度変更
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  // 時間フォーマット
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ビデオイベントハンドラー
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, skipBackward, skipForward, toggleMute, toggleFullscreen]);

  // コントロールの自動非表示
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseMove = () => resetTimer();
    const handleMouseLeave = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearTimeout(timeout);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isPlaying]);

  const handleVideoClick = () => {
    togglePlay();
  };

  const handleVideoKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
    >
      {/* ビデオ要素 */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handleVideoClick}
        onKeyDown={handleVideoKeyDown}
        tabIndex={0}
        aria-label={title ? `Video: ${title}` : "Video player"}
      >
        <track kind="captions" src="" label="No captions available" />
      </video>

      {/* タイトルオーバーレイ */}
      {title && (
        <div className={`absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}

      {/* コントロールパネル */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* プログレスバー */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
            aria-label="Video progress"
          />
        </div>

        {/* コントロールボタン */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 再生/一時停止 */}
            <button
              type="button"
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* スキップボタン */}
            <button
              type="button"
              onClick={skipBackward}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label="Skip backward 10 seconds"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              type="button"
              onClick={skipForward}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward size={20} />
            </button>

            {/* 音量コントロール */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                aria-label="Volume"
              />
            </div>

            {/* 時間表示 */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 設定 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-blue-400 transition-colors"
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>
              
              {showSettings && (
                <div className="absolute bottom-8 right-0 bg-black/90 rounded-md p-2 min-w-32">
                  <div className="text-white text-sm mb-2">再生速度</div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changePlaybackRate(rate)}
                      className={`block w-full text-left px-2 py-1 text-sm rounded ${
                        playbackRate === rate ? 'bg-blue-500 text-white' : 'text-white hover:bg-white/20'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            <button
              type="button"
              onClick={togglePictureInPicture}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label="Picture in picture"
            >
              <PictureInPicture2 size={20} />
            </button>

            {/* フルスクリーン */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* カスタムスライダースタイル */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
