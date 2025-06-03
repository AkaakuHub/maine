"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AnimeInfo } from "@/types/AnimeInfo";
import type { AnimeData } from "@/type";
import { useProgress } from "./useProgress";
import { API } from "@/utils/constants";

export function useVideoPlayer() {
	const params = useParams();
	const router = useRouter();
	const [animeData, setAnimeData] = useState<AnimeData | null>(null);
	const [animeInfo, setAnimeInfo] = useState<AnimeInfo>({
		title: "",
		episode: "",
		fullTitle: "",
	});
	const [videoSrc, setVideoSrc] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [showDescription, setShowDescription] = useState<boolean>(false);
	const [isLiked, setIsLiked] = useState<boolean>(false);
	const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);
	const { updateProgress } = useProgress();
	const lastProgressSaveRef = useRef<number>(0);
	const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const initializePlayer = useCallback(async () => {
		if (params.filePath) {
			setIsLoading(true);
			const decodedPath = decodeURIComponent(params.filePath as string);

			try {
				// APIからアニメデータを取得
				const response = await fetch(
					`${API.ENDPOINTS.ANIMES}?search=${encodeURIComponent(decodedPath)}&loadAll=true`,
				);
				if (response.ok) {
					const data = await response.json();
					const anime = data.animes?.find(
						(a: AnimeData) => a.filePath === decodedPath,
					);

					if (anime) {
						setAnimeData(anime);
						setIsLiked(anime.isLiked);

						setAnimeInfo({
							title: anime.title,
							episode: anime.episode?.toString() || "",
							fullTitle: anime.title,
							description: `${anime.title}をお楽しみください。`,
							genre: anime.genre || "アニメ",
							year: anime.year?.toString() || "不明",
							duration: anime.duration
								? `${Math.floor(anime.duration / 60)}:${Math.floor(
										anime.duration % 60,
									)
										.toString()
										.padStart(2, "0")}`
								: "不明",
						});
					} else {
						// フォールバック: ファイルパスからタイトルを抽出
						const pathParts = decodedPath.split("\\");
						const animeTitle = pathParts[0];
						const episodeName = pathParts[1]?.replace(".mp4", "") || "";

						setAnimeInfo({
							title: animeTitle,
							episode: episodeName,
							fullTitle: `${animeTitle} - ${episodeName}`,
							description: `${animeTitle}の${episodeName}をお楽しみください。`,
							genre: "アニメ",
							year: "不明",
							duration: "不明",
						});
					}
				}
			} catch (error) {
				console.error("Failed to fetch anime data:", error);
				// フォールバック処理
				const pathParts = decodedPath.split("\\");
				const animeTitle = pathParts[0];
				const episodeName = pathParts[1]?.replace(".mp4", "") || "";

				setAnimeInfo({
					title: animeTitle,
					episode: episodeName,
					fullTitle: `${animeTitle} - ${episodeName}`,
					description: `${animeTitle}の${episodeName}をお楽しみください。`,
					genre: "アニメ",
					year: "不明",
					duration: "不明",
				});
			}

			// API経由でビデオをストリーミング
			setVideoSrc(`/api/video/${encodeURIComponent(decodedPath)}`);
			setIsLoading(false);
		}
	}, [params.filePath]);
	useEffect(() => {
		initializePlayer();

		// クリーンアップ
		return () => {
			if (progressSaveIntervalRef.current) {
				clearInterval(progressSaveIntervalRef.current);
			}
		};
	}, [initializePlayer]);

	// 視聴進捗を保存する関数
	const saveProgress = useCallback(
		async (currentTime: number, duration: number) => {
			if (!animeData || !duration) return;

			const progress = Math.min(
				100,
				Math.max(0, (currentTime / duration) * 100),
			);

			// 5秒以上の差がある場合のみ保存（頻繁すぎる更新を防ぐ）
			if (Math.abs(currentTime - lastProgressSaveRef.current) >= 5) {
				lastProgressSaveRef.current = currentTime;

				try {
					await updateProgress({
						id: animeData.id,
						watchTime: currentTime,
						watchProgress: progress,
					});
				} catch (error) {
					console.error("Failed to save progress:", error);
				}
			}
		},
		[animeData, updateProgress],
	);

	// ビデオの時間更新ハンドラー
	const handleTimeUpdate = useCallback(
		(currentTime: number, duration: number) => {
			saveProgress(currentTime, duration);
		},
		[saveProgress],
	);

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
				console.log("共有がキャンセルされました");
			}
		} else {
			// フォールバック: クリップボードにコピー
			navigator.clipboard.writeText(window.location.href);
			alert("URLがクリップボードにコピーされました！");
		}
	};
	const toggleLike = async () => {
		if (!animeData) return;

		const newLikeStatus = !isLiked;
		setIsLiked(newLikeStatus); // 楽観的更新

		try {
			await updateProgress({
				id: animeData.id,
				isLiked: newLikeStatus,
			});
		} catch (error) {
			// エラー時は元に戻す
			setIsLiked(!newLikeStatus);
			console.error("Failed to update like status:", error);
		}
	};

	const toggleWatchlist = () => {
		setIsInWatchlist(!isInWatchlist);
	};

	const toggleDescription = () => {
		setShowDescription(!showDescription);
	};
	return {
		animeData,
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
		handleTimeUpdate,
		saveProgress,
	};
}
