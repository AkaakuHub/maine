"use client";

import { useState } from "react";
import type { AnimeData } from "@/type";
import SearchAndFilter, { type ViewMode, type SortBy, type SortOrder } from "@/components/SearchAndFilter";
import AnimeGridContainer from "@/components/AnimeGridContainer";
import AnimeList from "@/components/AnimeList";
import EmptyState from "@/components/EmptyState";

interface AnimeGridProps {
  animes: AnimeData[];
}

const AnimeGrid = ({ animes }: AnimeGridProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("title");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

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

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-slate-900" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBmaWxsPSJub25lIj4KPC9zdmc+')"
      }} />
      
      <div className="relative container mx-auto px-4 py-8">
        {/* 検索とフィルター */}
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          totalCount={animes.length}
          filteredCount={filteredAnimes.length}
          className="mb-8"
        />

        {/* コンテンツ */}
        {animes.length === 0 ? (
          <EmptyState type="no-animes" onRetry={handleRetry} />
        ) : filteredAnimes.length === 0 ? (
          <EmptyState type="no-search-results" searchTerm={searchTerm} />
        ) : viewMode === "grid" ? (
          <AnimeGridContainer animes={filteredAnimes} />
        ) : (
          <AnimeList animes={filteredAnimes} />
        )}
      </div>
    </div>
  );
};

export default AnimeGrid;
