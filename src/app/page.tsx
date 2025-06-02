"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnimeData, DatabaseUpdateResponse } from "@/type";
import AnimeGrid from "@/components/AnimeGrid";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

const Home = () => {
  const [animes, setAnimes] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // まずデータベースを更新
      const updateRes = await fetch('/api/updateDatabase');
      if (updateRes.ok) {
        const updateData: DatabaseUpdateResponse = await updateRes.json();
        console.log("Database update:", updateData);
      }
      
      // アニメデータを取得
      const animesRes = await fetch('/api/animes');
      if (animesRes.ok) {
        const animesData = await animesRes.json();
        setAnimes(animesData.animes || []);
      } else {
        setError("アニメデータの取得に失敗しました");
      }
    } catch (err) {
      console.error("App initialization error:", err);
      setError("アプリケーションの初期化中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingState type="initial" message="動画ファイルを検索しています..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <EmptyState type="loading-error" onRetry={initializeApp} />
        </div>
      </div>
    );
  }

  return (
    <main>
      <AnimeGrid animes={animes} />
    </main>
  );
};

export default Home;
