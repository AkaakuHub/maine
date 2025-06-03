"use client";

import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import VideoInfo from "./VideoInfo";
import RelatedVideos from "./RelatedVideos";
import type { AnimeInfo } from "@/types/AnimeInfo";

interface DesktopLayoutProps {
  videoSrc: string;
  animeInfo: AnimeInfo;
  onBack: () => void;
  isLiked: boolean;
  isInWatchlist: boolean;
  showDescription: boolean;
  onToggleLike: () => void;
  onToggleWatchlist: () => void;
  onShare: () => void;
  onToggleDescription: () => void;
}

export default function DesktopLayout({
  videoSrc,
  animeInfo,
  onBack,
  isLiked,
  isInWatchlist,
  showDescription,
  onToggleLike,
  onToggleWatchlist,
  onShare,
  onToggleDescription,
}: DesktopLayoutProps) {
  return (
    <div className="hidden lg:block h-[calc(100vh-64px)]">
      {/* メインコンテンツ */}
      <div className="flex h-full">
        {/* 動画プレイヤーセクション */}
        <div className="flex-1">
          <ModernVideoPlayer
            src={videoSrc}
            title={animeInfo.fullTitle}
            onBack={onBack}
          />
        </div>

        {/* サイドバー */}
        <div className="w-96 border-l border-purple-500/20 bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm overflow-y-auto">
          {/* 動画情報 */}
          <div className="p-6 border-b border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-2">
              {animeInfo.title}
            </h2>
            <p className="text-purple-300 text-base mb-3 font-medium">
              {animeInfo.episode}
            </p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mb-4">
              <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium">
                {animeInfo.genre}
              </span>
              <span>{animeInfo.year}</span>
              <span>•</span>
              <span>{animeInfo.duration}</span>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={onToggleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  isLiked 
                    ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/25' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-red-500/20 hover:text-pink-300 border border-slate-600'
                }`}
              >
                <span className="text-sm">いいね</span>
              </button>
              
              <button
                type="button"
                onClick={onToggleWatchlist}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  isInWatchlist 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 hover:text-blue-300 border border-slate-600'
                }`}
              >
                <span className="text-sm">リスト追加</span>
              </button>
            </div>

            {/* 概要 */}
            <div>
              <button
                type="button"
                onClick={onToggleDescription}
                className="text-left w-full"
              >
                <h3 className="text-white font-semibold mb-2 flex items-center justify-between">
                  概要
                  <span className="text-purple-300 text-sm font-medium">
                    {showDescription ? '簡潔に表示' : 'もっと見る'}
                  </span>
                </h3>
              </button>
              
              <p className={`text-slate-300 text-sm leading-relaxed transition-all duration-300 ${
                showDescription 
                  ? '' 
                  : 'overflow-hidden text-ellipsis'
              }`}
              style={!showDescription ? {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              } : {}}>
                {animeInfo.description}
              </p>
            </div>
          </div>

          {/* 関連動画 */}
          <RelatedVideos animeInfo={animeInfo} isMobile={false} />
        </div>
      </div>
    </div>
  );
}
