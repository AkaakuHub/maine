"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AnimeInfo } from "@/types/AnimeInfo";

export function useVideoPlayer() {
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

  const toggleDescription = () => {
    setShowDescription(!showDescription);
  };

  return {
    animeInfo,
    videoSrc,
    isLoading,
    showDescription,
    isLiked,
    isInWatchlist,
    handleGoBack,
    handleGoHome,
    handleShare,
    toggleLike,
    toggleWatchlist,
    toggleDescription,
  };
}
