"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import { ArrowLeft, Home, Share2, Download, MoreVertical, Heart, ThumbsUp, ThumbsDown, List } from "lucide-react";

interface AnimeInfo {
  title: string;
  episode: string;
  fullTitle: string;
  description?: string;
  genre?: string;
  year?: string;
  duration?: string;
}

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo>({
    title: "",
    episode: "",
    fullTitle: ""
  });
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);

  const initializePlayer = useCallback(() => {
    if (params.filePath) {
      setIsLoading(true);
      const decodedPath = decodeURIComponent(params.filePath as string);
      
      // ファイルパスからタイトルを抽出
      const pathParts = decodedPath.split("\\");
      const animeTitle = pathParts[0];
      const episodeName = pathParts[1]?.replace('.mp4', '') || '';
      
      setAnimeInfo({
        title: animeTitle,
        episode: episodeName,
        fullTitle: `${animeTitle} - ${episodeName}`,
        description: `${animeTitle}の${episodeName}をお楽しみください。高画質でストリーミング配信中です。`,
        genre: "アニメ",
        year: "2024",
        duration: "24:00"
      });
      
      // API経由でビデオをストリーミング
      setVideoSrc(`/api/video/${encodeURIComponent(decodedPath)}`);
      setIsLoading(false);
    }
  }, [params.filePath]);

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: animeInfo.fullTitle,
          url: window.location.href,
        });
      } catch (err) {
        console.log('共有がキャンセルされました');
      }
    } else {
      // フォールバック: クリップボードにコピー
      navigator.clipboard.writeText(window.location.href);
      alert('URLがクリップボードにコピーされました！');
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const toggleWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
  };

  if (isLoading || !videoSrc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">動画を読み込み中...</h2>
          <p className="text-gray-400">少々お待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* ナビゲーションバー */}
      <nav className="relative z-50 bg-gradient-to-r from-black/95 via-black/90 to-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-all duration-200 p-2 rounded-lg hover:bg-white/10 active:scale-95"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">戻る</span>
              </button>
              
              <button
                type="button"
                onClick={handleGoHome}
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-all duration-200 p-2 rounded-lg hover:bg-white/10 active:scale-95"
              >
                <Home size={18} />
                <span className="hidden sm:inline">ホーム</span>
              </button>
            </div>
            
            <div className="text-white text-center flex-1 mx-4">
              <h1 className="text-base sm:text-lg font-semibold truncate">
                {animeInfo.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                {animeInfo.episode}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="p-2 text-white hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="共有"
              >
                <Share2 size={18} />
              </button>
              <button
                type="button"
                className="p-2 text-white hover:text-gray-300 hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="その他のオプション"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <div className="flex flex-col xl:flex-row min-h-[calc(100vh-64px)]">
        {/* 動画プレイヤーセクション */}
        <div className="xl:flex-1 xl:max-w-none">
          <div className="aspect-video xl:h-[calc(100vh-64px)] xl:aspect-auto">
            <ModernVideoPlayer
              src={videoSrc}
              title={animeInfo.fullTitle}
              onBack={handleGoBack}
            />
          </div>
        </div>

        {/* サイドバー（情報・関連動画エリア） */}
        <div className="xl:w-96 xl:border-l xl:border-white/10 bg-gray-900/50 backdrop-blur-sm">
          {/* 動画情報 */}
          <div className="p-4 sm:p-6 border-b border-white/10">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {animeInfo.title}
              </h2>
              <p className="text-gray-300 text-sm sm:text-base mb-3">
                {animeInfo.episode}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                <span>{animeInfo.genre}</span>
                <span>•</span>
                <span>{animeInfo.year}</span>
                <span>•</span>
                <span>{animeInfo.duration}</span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={toggleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isLiked 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                <span className="text-sm">いいね</span>
              </button>
              
              <button
                type="button"
                onClick={toggleWatchlist}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isInWatchlist 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <List size={16} />
                <span className="text-sm">リストに追加</span>
              </button>
            </div>

            {/* 概要 */}
            <div>
              <button
                type="button"
                onClick={() => setShowDescription(!showDescription)}
                className="text-left w-full"
              >
                <h3 className="text-white font-semibold mb-2 flex items-center justify-between">
                  概要
                  <span className="text-gray-400 text-sm">
                    {showDescription ? '簡潔に表示' : 'もっと見る'}
                  </span>
                </h3>
              </button>
              
              <p className={`text-gray-300 text-sm leading-relaxed transition-all duration-200 ${
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

          {/* 関連動画プレースホルダー */}
          <div className="p-4 sm:p-6">
            <h3 className="text-white font-semibold mb-4">関連動画</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="w-24 h-16 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">動画{i}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium truncate">
                      関連動画 {i}
                    </h4>
                    <p className="text-gray-400 text-xs mt-1">24:00</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
