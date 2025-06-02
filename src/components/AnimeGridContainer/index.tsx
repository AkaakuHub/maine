"use client";

import type { AnimeData } from "@/type";
import AnimeCard from "@/components/AnimeCard";
import { cn } from "@/libs/utils";

interface AnimeGridProps {
  animes: AnimeData[];
  className?: string;
}

const AnimeGrid = ({ animes, className }: AnimeGridProps) => {
  return (
    <div className={cn(
      "grid gap-6",
      // レスポンシブグリッド - モバイルファーストアプローチ
      "grid-cols-1",                    // モバイル: 1列
      "xs:grid-cols-2",                 // 小さなモバイル: 2列
      "sm:grid-cols-2",                 // タブレット縦: 2列
      "md:grid-cols-3",                 // タブレット横/小さなデスクトップ: 3列
      "lg:grid-cols-4",                 // デスクトップ: 4列
      "xl:grid-cols-5",                 // 大きなデスクトップ: 5列
      "2xl:grid-cols-6",                // 超大きなデスクトップ: 6列
      className
    )}>
      {animes.map((anime, index) => (
        <AnimeCard
          key={anime.id}
          anime={anime}
          priority={index < 6} // 最初の6つの画像を優先読み込み
        />
      ))}
    </div>
  );
};

export default AnimeGrid;
