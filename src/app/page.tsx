"use client";

import { useState, useEffect } from "react";
import type { AnimeData, DatabaseUpdateResponse } from "@/type";
import AnimeGrid from "@/components/AnimeGrid";

const Home = () => {
  const [animes, setAnimes] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
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
    };
    
    initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">データベースを読み込み中...</h2>
          <p className="text-slate-400">動画ファイルを検索しています</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">エラーが発生しました</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            再読み込み
          </button>
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
