"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import type { VideoInfoType } from "@/types/VideoInfo";
import type { VideoFileData } from "@/type";
import { useProgress } from "./useProgress";
import { API } from "@/utils/constants";

export function useVideoPlayer() {
	const params = useParams();
	const router = useRouter();
	const [videoData, setVideoData] = useState<VideoFileData | null>(null);
	const [videoInfo, setVideoInfo] = useState<VideoInfoType>({
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
			console.log("Initializing player for:", decodedPath);

			try {
				// APIから動画データを取得（完全マッチで検索）
				const response = await fetch(
					`${API.ENDPOINTS.VIDEOS}?search=${encodeURIComponent(
						decodedPath,
					)}&exactMatch=true`,
				);
				console.log("API response status:", response.status);

				if (response.ok) {
					const data = await response.json();
					console.log("API response data:", data);
					console.log("Looking for video with filePath:", decodedPath);
					console.log(
						"Available videos:",
						data.videos?.map((v: VideoFileData) => ({
							filePath: v.filePath,
							watchTime: v.watchTime,
							watchProgress: v.watchProgress,
						})),
					);

					const video = data.videos?.find(
						(a: VideoFileData) => a.filePath === decodedPath,
					);
					console.log("Found video:", video);

					if (video) {
						setVideoData(video);
						console.log("VideoData set from API:", video);
						console.log("Watch time from API:", video.watchTime);
						console.log("Watch progress from API:", video.watchProgress);
						setIsLiked(video.isLiked);

						setVideoInfo({
							title: video.title,
							episode: video.episode?.toString() || "",
							fullTitle: video.title,
							description: `${video.title}をお楽しみください。`,
							genre: video.genre || "動画",
							year: video.year?.toString() || "不明",
							duration: video.duration
								? `${Math.floor(video.duration / 60)}:${Math.floor(
										video.duration % 60,
									)
										.toString()
										.padStart(2, "0")}`
								: "不明",
						});
					} else {
						// フォールバック: ファイルパスからタイトルを抽出
						const pathParts = decodedPath.split(/[/\\]/);
						const videoTitle = pathParts[pathParts.length - 2] || pathParts[0];
						const episodeName =
							pathParts[pathParts.length - 1]?.replace(
								/\.(mp4|mkv|avi|mov)$/i,
								"",
							) || "";

						// フォールバック用のvideoDataオブジェクトを作成
						// 注意: フォールバック時はwatchTimeは0に設定（進捗データが取得できない場合）
						const fallbackVideoData: VideoFileData = {
							id: "fallback",
							filePath: decodedPath,
							title: videoTitle,
							fileName: episodeName,
							fileSize: 0,
							episode: undefined,
							duration: undefined,
							year: undefined,
							genre: undefined,
							isLiked: false,
							watchTime: 0, // フォールバック時は0から開始
							watchProgress: 0,
						};

						setVideoData(fallbackVideoData);
						console.log(
							"VideoData set from fallback (no video found):",
							fallbackVideoData,
						);
						setIsLiked(false);

						setVideoInfo({
							title: videoTitle,
							episode: episodeName,
							fullTitle: `${videoTitle} - ${episodeName}`,
							description: `${videoTitle}の${episodeName}をお楽しみください。`,
							genre: "動画",
							year: "不明",
							duration: "不明",
						});
					}
				}
			} catch (error) {
				console.error("Failed to fetch video data:", error);
				// フォールバック処理
				const pathParts = decodedPath.split(/[/\\]/);
				const videoTitle = pathParts[pathParts.length - 2] || pathParts[0];
				const episodeName =
					pathParts[pathParts.length - 1]?.replace(
						/\.(mp4|mkv|avi|mov)$/i,
						"",
					) || "";

				// フォールバック用のvideoDataオブジェクトを作成
				// 注意: エラー時はwatchTimeは0に設定（進捗データが取得できない場合）
				const fallbackVideoData: VideoFileData = {
					id: "fallback-error",
					filePath: decodedPath,
					title: videoTitle,
					fileName: episodeName,
					fileSize: 0,
					episode: undefined,
					duration: undefined,
					year: undefined,
					genre: undefined,
					isLiked: false,
					watchTime: 0, // エラー時は0から開始
					watchProgress: 0,
				};

				setVideoData(fallbackVideoData);
				console.log(
					"VideoData set from fallback (API error):",
					fallbackVideoData,
				);
				setIsLiked(false);

				setVideoInfo({
					title: videoTitle,
					episode: episodeName,
					fullTitle: `${videoTitle} - ${episodeName}`,
					description: `${videoTitle}の${episodeName}をお楽しみください。`,
					genre: "動画",
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
			if (!videoData || !duration) return;

			const progress = Math.min(
				100,
				Math.max(0, (currentTime / duration) * 100),
			);

			// 5秒以上の差がある場合のみ保存（頻繁すぎる更新を防ぐ）
			if (Math.abs(currentTime - lastProgressSaveRef.current) >= 5) {
				lastProgressSaveRef.current = currentTime;

				try {
					await updateProgress({
						filePath: videoData.filePath,
						watchTime: currentTime,
						watchProgress: progress,
					});
				} catch (error) {
					console.error("Failed to save progress:", error);
				}
			}
		},
		[videoData, updateProgress],
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
					title: videoInfo.fullTitle,
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
		if (!videoData) return;

		const newLikeStatus = !isLiked;
		setIsLiked(newLikeStatus); // 楽観的更新

		try {
			await updateProgress({
				filePath: videoData.filePath,
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

	const handleDownload = useCallback(async () => {
		console.log("Download button clicked");
		console.log("videoData:", videoData);

		if (!videoData?.filePath) {
			console.error("No video data or file path available");
			return;
		}

		try {
			// ダウンロードリンクを作成
			const downloadUrl = `/api/video/${encodeURIComponent(
				videoData.filePath,
			)}?download=true`;
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = videoData.filePath.split(/[/\\]/).pop() || "video.mp4";
			link.target = "_blank";

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error("Failed to download video:", error);
		}
	}, [videoData]);

	return {
		videoData,
		videoInfo,
		videoSrc,
		isLoading,
		showDescription,
		isLiked,
		isInWatchlist,
		handleGoBack,
		handleGoHome,
		handleShare,
		handleDownload,
		toggleLike,
		toggleWatchlist,
		toggleDescription,
		handleTimeUpdate,
		saveProgress,
	};
}
