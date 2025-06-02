"use client";

import { useState } from "react";
import { Search, Filter, Grid, List, SortAsc, SortDesc, X } from "lucide-react";
import { cn } from "@/libs/utils";

export type ViewMode = "grid" | "list";
export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
}

const SearchAndFilter = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  totalCount,
  filteredCount,
  className
}: SearchAndFilterProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const clearSearch = () => {
    onSearchChange("");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* メインヘッダー */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            My Anime Storage
          </h1>
          <p className="text-slate-400">
            {filteredCount === totalCount 
              ? `${totalCount} アニメ`
              : `${filteredCount} / ${totalCount} アニメが見つかりました`
            }
          </p>
        </div>
        
        {/* 表示モード切り替え */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
                viewMode === "grid"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <Grid className="h-4 w-4" />
              <span className="hidden sm:inline">グリッド</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
                viewMode === "list"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">リスト</span>
            </button>
          </div>
        </div>
      </div>

      {/* 検索とフィルター */}
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 検索バー */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="アニメのタイトルやファイル名で検索..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* フィルターボタン */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                showFilters
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50"
              )}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden sm:inline">フィルター</span>
            </button>
          </div>
        </div>

        {/* 展開可能なフィルター */}
        <div className={cn(
          "transition-all duration-300 overflow-hidden",
          showFilters ? "max-h-32 mt-4" : "max-h-0"
        )}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* ソート */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                並び順:
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value as SortBy)}
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="title">タイトル順</option>
                  <option value="year">年順</option>
                  <option value="episode">エピソード順</option>
                  <option value="createdAt">追加順</option>
                </select>
                <button
                  type="button"
                  onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
                  className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title={sortOrder === "asc" ? "昇順" : "降順"}
                >
                  {sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilter;
