"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import ModernVideoPlayer from "@/components/ModernVideoPlayer";
import { ArrowLeft, Home, Share2, Download, MoreVertical, Heart, ThumbsUp, ThumbsDown, List, Play } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20">
      {/* ナビゲーションバー - 全画面で表示 */}
      <nav className="relative z-50 bg-gradient-to-r from-slate-900/95 via-purple-900/20 to-blue-900/20 backdrop-blur-sm border-b border-purple-500/20 h-16 flex-shrink-0">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-white hover:text-purple-300 transition-all duration-200 p-2 rounded-lg hover:bg-purple-500/10 active:scale-95"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">戻る</span>
              </button>
              
              <button
                type="button"
                onClick={handleGoHome}
                className="flex items-center gap-2 text-white hover:text-blue-300 transition-all duration-200 p-2 rounded-lg hover:bg-blue-500/10 active:scale-95"
              >
                <Home size={18} />
                <span className="hidden sm:inline">ホーム</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="p-2 text-white hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="共有"
              >
                <Share2 size={18} />
              </button>
              <button
                type="button"
                className="p-2 text-white hover:text-slate-300 hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="その他のオプション"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* モバイル・縦画面レイアウト */}
      <div className="lg:hidden">
        {/* 動画プレイヤー */}
        <div className="w-full">
          <ModernVideoPlayer
            src={videoSrc}
            title={animeInfo.fullTitle}
            onBack={handleGoBack}
          />
        </div>

        {/* モバイル用コンテンツエリア */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          {/* 動画情報セクション */}
          <div className="p-4 border-b border-purple-500/20">
            <h1 className="text-xl font-bold text-white mb-2 leading-tight">
              {animeInfo.title}
            </h1>
            <p className="text-purple-300 mb-3 font-medium">
              {animeInfo.episode}
            </p>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 mb-4">
              <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium">
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
                onClick={toggleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  isLiked 
                    ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/25' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-red-500/20 hover:text-pink-300 border border-slate-600'
                }`}
              >
                <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                <span className="text-sm">いいね</span>
              </button>
              
              <button
                type="button"
                onClick={toggleWatchlist}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  isInWatchlist 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 hover:text-blue-300 border border-slate-600'
                }`}
              >
                <List size={16} />
                <span className="text-sm">リスト追加</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-emerald-500/20 hover:text-green-300 border border-slate-600"
              >
                <Share2 size={16} />
                <span className="text-sm">共有</span>
              </button>
            </div>

            {/* 概要 */}
            <div>
              <button
                type="button"
                onClick={() => setShowDescription(!showDescription)}
                className="text-left w-full mb-3"
              >
                <h3 className="text-white font-semibold flex items-center justify-between">
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

          {/* 関連動画セクション */}
          <div className="p-4">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
              関連動画
            </h3>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group">
                  <div className="w-32 h-20 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg flex-shrink-0 flex items-center justify-center border border-purple-500/20 group-hover:border-purple-400/40 transition-colors">
                    <Play className="text-purple-300 group-hover:text-purple-200" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium mb-1 group-hover:text-purple-200 transition-colors">
                      {animeInfo.title} - エピソード {i + 1}
                    </h4>
                    <p className="text-slate-400 text-xs mb-1">24:00</p>
                    <p className="text-slate-500 text-xs">1週間前</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* デスクトップレイアウト */}
      <div className="hidden lg:block h-screen">
        {/* ナビゲーションバー */}
        <nav className="relative z-50 bg-gradient-to-r from-slate-900/95 via-purple-900/20 to-blue-900/20 backdrop-blur-sm border-b border-purple-500/20 h-16 flex-shrink-0">
          <div className="container mx-auto px-4 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex items-center gap-2 text-white hover:text-purple-300 transition-all duration-200 p-2 rounded-lg hover:bg-purple-500/10 active:scale-95"
                >
                  <ArrowLeft size={18} />
                  <span>戻る</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="flex items-center gap-2 text-white hover:text-blue-300 transition-all duration-200 p-2 rounded-lg hover:bg-blue-500/10 active:scale-95"
                >
                  <Home size={18} />
                  <span>ホーム</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 text-white hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200 active:scale-95"
                  aria-label="共有"
                >
                  <Share2 size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 text-white hover:text-slate-300 hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95"
                  aria-label="その他のオプション"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <div className="flex h-[calc(100vh-64px)]">
          {/* 動画プレイヤーセクション */}
          <div className="flex-1">
            <ModernVideoPlayer
              src={videoSrc}
              title={animeInfo.fullTitle}
              onBack={handleGoBack}
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
                  onClick={toggleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    isLiked 
                      ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/25' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-red-500/20 hover:text-pink-300 border border-slate-600'
                  }`}
                >
                  <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                  <span className="text-sm">いいね</span>
                </button>
                
                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    isInWatchlist 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 hover:text-blue-300 border border-slate-600'
                  }`}
                >
                  <List size={16} />
                  <span className="text-sm">リスト追加</span>
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
            <div className="p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
                関連動画
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group">
                    <div className="w-24 h-16 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg flex-shrink-0 flex items-center justify-center border border-purple-500/20 group-hover:border-purple-400/40 transition-colors">
                      <Play className="text-purple-300 group-hover:text-purple-200" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate group-hover:text-purple-200 transition-colors">
                        {animeInfo.title} - エピソード {i + 1}
                      </h4>
                      <p className="text-slate-400 text-xs mt-1">24:00</p>
                      <p className="text-slate-500 text-xs">1週間前</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
