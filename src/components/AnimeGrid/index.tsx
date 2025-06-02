"use client";

import { useState } from "react";
import type { AnimeData } from "@/type";
import { Play, Search, Grid, List, Filter, Calendar, Film } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/libs/utils";

interface AnimeGridProps {
  animes: AnimeData[];
}

const AnimeGrid = ({ animes }: AnimeGridProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"title" | "year" | "episode" | "createdAt">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // フィルタリングとソート
  const filteredAnimes = animes
    .filter((anime) => {
      const matchesSearch = anime.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           anime.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortBy) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "year":
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
        case "episode":
          aVal = a.episode || 0;
          bVal = b.episode || 0;
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

  const formatFileSize = (sizeStr: string): string => {
    const size = Number.parseInt(sizeStr, 10);
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Anime Storage
          </h1>
          <p className="text-slate-400 text-lg">
            {filteredAnimes.length} アニメが見つかりました
          </p>
        </div>

        {/* 検索・ソート */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="アニメを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            {/* ソート */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-400 transition-colors"
              >
                <option value="title">タイトル順</option>
                <option value="year">年順</option>
                <option value="episode">エピソード順</option>
                <option value="createdAt">追加順</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white hover:bg-slate-700/50 transition-colors"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>

            {/* 表示モード切り替え */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center",
                  viewMode === "grid" 
                    ? "bg-blue-500 text-white" 
                    : "bg-slate-800/50 text-slate-400 hover:text-white"
                )}
              >
                <Grid className="h-4 w-4" />
                グリッド
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center",
                  viewMode === "list" 
                    ? "bg-blue-500 text-white" 
                    : "bg-slate-800/50 text-slate-400 hover:text-white"
                )}
              >
                <List className="h-4 w-4" />
                リスト
              </button>
            </div>
          </div>
        </div>

        {/* アニメリスト */}
        {filteredAnimes.length === 0 ? (
          <div className="text-center py-12">
            <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">アニメが見つかりません</h3>
            <p className="text-slate-400">検索条件を変更してみてください</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAnimes.map((anime) => (
              <Link
                key={anime.id}
                href={`/play/${encodeURIComponent(anime.filePath)}`}
                className="group"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                  <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {anime.thumbnail ? (
                      <Image 
                        src={anime.thumbnail} 
                        alt={anime.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Play className="h-8 w-8 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mb-1 line-clamp-2 text-sm">
                    {anime.title}
                  </h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    {anime.episode && <p>エピソード {anime.episode}</p>}
                    {anime.year && <p>{anime.year}年</p>}
                    <p>{formatFileSize(anime.fileSize)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnimes.map((anime) => (
              <Link
                key={anime.id}
                href={`/play/${encodeURIComponent(anime.filePath)}`}
                className="group"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:border-blue-400/50 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      {anime.thumbnail ? (
                        <img 
                          src={anime.thumbnail} 
                          alt={anime.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Play className="h-6 w-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 truncate">
                        {anime.title}
                      </h3>
                      <p className="text-sm text-slate-400 truncate mb-2">
                        {anime.fileName}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {anime.episode && <span>Episode {anime.episode}</span>}
                        {anime.year && <span>{anime.year}</span>}
                        <span>{formatFileSize(anime.fileSize)}</span>
                        {anime.lastWatched && (
                          <span>最後に視聴: {new Date(anime.lastWatched).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Play className="h-8 w-8 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeGrid;
