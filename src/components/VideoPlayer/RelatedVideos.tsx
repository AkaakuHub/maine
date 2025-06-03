"use client";

import { Play } from "lucide-react";
import type { AnimeInfo } from "../../types/AnimeInfo";

interface RelatedVideosProps {
  animeInfo: AnimeInfo;
  isMobile?: boolean;
}

export default function RelatedVideos({ animeInfo, isMobile = false }: RelatedVideosProps) {
  const videoCount = 5;
  const thumbnailSize = isMobile ? "w-32 h-20" : "w-24 h-16";
  const playIconSize = isMobile ? 20 : 16;

  return (
    <div className="p-4 lg:p-6">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
        関連動画
      </h3>
      <div className="space-y-3 lg:space-y-3">
        {Array.from({ length: videoCount }, (_, i) => (
          <div 
            key={`related-video-${Date.now()}-${i}`} 
            className="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group"
          >
            <div className={`${thumbnailSize} bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg flex-shrink-0 flex items-center justify-center border border-purple-500/20 group-hover:border-purple-400/40 transition-colors`}>
              <Play className="text-purple-300 group-hover:text-purple-200" size={playIconSize} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white text-sm font-medium mb-1 group-hover:text-purple-200 transition-colors truncate">
                {animeInfo.title} - エピソード {i + 1}
              </h4>
              <p className="text-slate-400 text-xs mb-1">24:00</p>
              <p className="text-slate-500 text-xs">1週間前</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
