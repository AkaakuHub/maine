"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { ArrowLeft, Home } from "lucide-react";

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoSrc, setVideoSrc] = useState<string>("");

  useEffect(() => {
    if (params.filePath) {
      const decodedPath = decodeURIComponent(params.filePath as string);
      
      // ファイルパスからタイトルを抽出
      const pathParts = decodedPath.split("\\");
      const animeTitle = pathParts[0];
      const episodeName = pathParts[1]?.replace('.mp4', '') || '';
      
      setVideoTitle(`${animeTitle} - ${episodeName}`);
      
      // API経由でビデオをストリーミング
      setVideoSrc(`/api/video/${encodeURIComponent(decodedPath)}`);
    }
  }, [params.filePath]);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  if (!videoSrc) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">動画を読み込み中...</h2>
          <p className="text-slate-400">少々お待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* ナビゲーションバー */}
      <div className="relative z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <ArrowLeft size={20} />
                <span>戻る</span>
              </button>
              
              <button
                type="button"
                onClick={handleGoHome}
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <Home size={20} />
                <span>ホーム</span>
              </button>
            </div>
            
            <div className="text-white">
              <h1 className="text-lg font-semibold truncate max-w-md">
                {videoTitle}
              </h1>
            </div>
            
            <div className="w-32" /> {/* スペーサー */}
          </div>
        </div>
      </div>

      {/* ビデオプレイヤー */}
      <div className="h-screen pt-16">
        <VideoPlayer
          src={videoSrc}
          title={videoTitle}
          className="h-full"
        />
      </div>
      
      {/* キーボードショートカットのヘルプ */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white p-4 rounded-lg text-sm opacity-0 hover:opacity-100 transition-opacity">
        <h3 className="font-semibold mb-2">キーボードショートカット</h3>
        <div className="space-y-1 text-xs">
          <div><kbd className="bg-white/20 px-1 rounded">Space</kbd> - 再生/一時停止</div>
          <div><kbd className="bg-white/20 px-1 rounded">←</kbd> - 10秒戻る</div>
          <div><kbd className="bg-white/20 px-1 rounded">→</kbd> - 10秒進む</div>
          <div><kbd className="bg-white/20 px-1 rounded">M</kbd> - ミュート切り替え</div>
          <div><kbd className="bg-white/20 px-1 rounded">F</kbd> - フルスクリーン切り替え</div>
        </div>
      </div>
    </div>
  );
}
