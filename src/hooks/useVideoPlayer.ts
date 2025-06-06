"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { VideoInfoType } from "@/types/VideoInfo";
import type { VideoFileData } from "@/type";
import { useProgress } from "./useProgress";
import { useOfflineStorage } from "./useOfflineStorage";
import { useNetworkStatus } from "./useNetworkStatus";
import { API } from "@/utils/constants";
import {
	offlineStorageService,
	type CachedVideo,
} from "@/services/offlineStorageService";

export function useVideoPlayer() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const explicitOfflineMode = searchParams.get("offline") === "true";
	const { isOnline } = useNetworkStatus();
	const { getCachedVideoUrl } = useOfflineStorage();

	// オフラインモードの判定: 明示的なオフラインモード or ネットワーク切断時
	const isOfflineMode = explicitOfflineMode || !isOnline;

	const [videoData, setVideoData] = useState<VideoFileData | null>(null);
	const [videoInfo, setVideoInfo] = useState<VideoInfoType>({
		title: "",
		episode: "",
		fullTitle: "",
		filePath: "",
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
				if (isOfflineMode) {
					// オフラインモード: キャッシュされた動画データから情報を取得
					console.log(
						"オフラインモード: キャッシュされた動画を検索中:",
						decodedPath,
					);

					// 最新のキャッシュされた動画リストを取得
					const currentCachedVideos: CachedVideo[] =
						await offlineStorageService.getAllCachedVideos();
					console.log(
						"利用可能なキャッシュされた動画:",
						currentCachedVideos.map((v: CachedVideo) => v.filePath),
					);

					const cachedVideo = currentCachedVideos.find(
						(video: CachedVideo) => video.filePath === decodedPath,
					);

					if (cachedVideo) {
						console.log(
							"キャッシュされた動画が見つかりました:",
							cachedVideo.title,
						);
						// オフライン動画のBlobURLを取得
						const offlineUrl = await getCachedVideoUrl(decodedPath);
						if (!offlineUrl) {
							console.error("オフライン動画の取得に失敗しました:", decodedPath);
							// オフライン動画が見つからない場合、ストリーミングモードに切り替え
							router.push(`/play/${encodeURIComponent(decodedPath)}`);
							return;
						}

						// キャッシュされた動画データからVideoFileDataを構築
						const offlineVideoData: VideoFileData = {
							id: `offline-${cachedVideo.filePath}`,
							filePath: cachedVideo.filePath,
							title: cachedVideo.title,
							fileName: cachedVideo.title,
							fileSize: cachedVideo.size,
							episode: undefined,
							duration: cachedVideo.duration,
							year: undefined,
							genre: undefined,
							isLiked: false, // オフラインモードではLike機能は無効
							watchTime: 0, // オフラインモードでは進捗保存なし
							watchProgress: 0,
						};

						setVideoData(offlineVideoData);
						setIsLiked(false);
						setVideoInfo({
							title: cachedVideo.title,
							episode: "",
							fullTitle: cachedVideo.title,
							filePath: decodedPath,
							description: `${cachedVideo.title}をお楽しみください。`,
							genre: "動画",
							year: "不明",
							duration: cachedVideo.duration
								? `${Math.floor(cachedVideo.duration / 60)}:${Math.floor(
										cachedVideo.duration % 60,
									)
										.toString()
										.padStart(2, "0")}`
								: "不明",
						});

						setVideoSrc(offlineUrl);
					} else {
						console.error(
							"キャッシュされた動画が見つかりません。検索パス:",
							decodedPath,
						);
						console.error(
							"利用可能なキャッシュされた動画:",
							currentCachedVideos.map((v: CachedVideo) => ({
								filePath: v.filePath,
								title: v.title,
							})),
						);

						// オフライン時でキャッシュされた動画が見つからない場合のフォールバック
						if (!isOnline) {
							// ファイルパスから基本情報を推測してフォールバック表示
							const pathParts = decodedPath.split(/[/\\]/);
							const videoTitle =
								pathParts[pathParts.length - 1]?.replace(
									/\.(mp4|mkv|avi|mov)$/i,
									"",
								) || "不明な動画";

							const fallbackVideoData: VideoFileData = {
								id: `fallback-${decodedPath}`,
								filePath: decodedPath,
								title: videoTitle,
								fileName: videoTitle,
								fileSize: 0,
								episode: undefined,
								duration: undefined,
								year: undefined,
								genre: undefined,
								isLiked: false,
								watchTime: 0,
								watchProgress: 0,
							};

							setVideoData(fallbackVideoData);
							setVideoInfo({
								title: videoTitle,
								episode: "",
								fullTitle: videoTitle,
								filePath: decodedPath,
								description: "オフライン時のため、詳細情報は利用できません。",
								genre: "動画",
								year: "不明",
								duration: "不明",
							});

							// オフライン時はvideoSrcを設定しない（再生不可状態）
							setVideoSrc("");
						} else {
							// オンライン時はストリーミングモードに切り替え
							router.push(`/play/${encodeURIComponent(decodedPath)}`);
						}
						return;
					}
				} else {
					// ストリーミングモード: APIから動画データを取得
					const response = await fetch(
						`${API.ENDPOINTS.VIDEOS}?search=${encodeURIComponent(
							decodedPath,
						)}&exactMatch=true`,
					);

					if (response.ok) {
						const data = await response.json();
						const video = data.videos?.find(
							(a: VideoFileData) => a.filePath === decodedPath,
						);

						if (video) {
							setVideoData(video);
							setIsLiked(video.isLiked);
							setVideoInfo({
								title: video.title,
								episode: video.episode?.toString() || "",
								fullTitle: video.title,
								filePath: decodedPath,
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
							const videoTitle =
								pathParts[pathParts.length - 2] || pathParts[0];
							const episodeName =
								pathParts[pathParts.length - 1]?.replace(
									/\.(mp4|mkv|avi|mov)$/i,
									"",
								) || "";

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
								watchTime: 0,
								watchProgress: 0,
							};

							setVideoData(fallbackVideoData);
							setIsLiked(false);
							setVideoInfo({
								title: videoTitle,
								episode: episodeName,
								fullTitle: `${videoTitle} - ${episodeName}`,
								filePath: decodedPath,
								description: `${videoTitle}の${episodeName}をお楽しみください。`,
								genre: "動画",
								year: "不明",
								duration: "不明",
							});
						}
					}

					// ストリーミング用のビデオソースを設定
					setVideoSrc(`/api/video/${encodeURIComponent(decodedPath)}`);
				}
			} catch (error) {
				console.error("Failed to initialize player:", error);

				if (isOfflineMode) {
					// オフラインモードでエラーが発生した場合、ホームに戻る
					alert("オフライン動画の読み込みに失敗しました。");
					router.push("/");
					return;
				}

				// ストリーミングモードでのフォールバック処理
				const pathParts = decodedPath.split(/[/\\]/);
				const videoTitle = pathParts[pathParts.length - 2] || pathParts[0];
				const episodeName =
					pathParts[pathParts.length - 1]?.replace(
						/\.(mp4|mkv|avi|mov)$/i,
						"",
					) || "";

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
					watchTime: 0,
					watchProgress: 0,
				};

				setVideoData(fallbackVideoData);
				setIsLiked(false);
				setVideoInfo({
					title: videoTitle,
					episode: episodeName,
					fullTitle: `${videoTitle} - ${episodeName}`,
					filePath: decodedPath,
					description: `${videoTitle}の${episodeName}をお楽しみください。`,
					genre: "動画",
					year: "不明",
					duration: "不明",
				});

				setVideoSrc(`/api/video/${encodeURIComponent(decodedPath)}`);
			}

			setIsLoading(false);
		}
	}, [params.filePath, isOfflineMode, getCachedVideoUrl, router, isOnline]);
	useEffect(() => {
		initializePlayer();

		// エフェクト開始時点でのrefの値をコピー
		const currentInterval = progressSaveIntervalRef.current;

		// クリーンアップ
		return () => {
			if (currentInterval) {
				clearInterval(currentInterval);
			}
		};
	}, [initializePlayer]);

	// 視聴進捗を保存する関数
	const saveProgress = useCallback(
		async (currentTime: number, duration: number) => {
			// オフラインモードでは進捗を保存しない
			if (isOfflineMode || !videoData || !duration) return;

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
		[isOfflineMode, videoData, updateProgress],
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
			} catch {
				// 共有がキャンセルされました
			}
		} else {
			// フォールバック: クリップボードにコピー
			navigator.clipboard.writeText(window.location.href);
			alert("URLがクリップボードにコピーされました！");
		}
	};
	const toggleLike = async () => {
		// オフラインモードではLike機能を無効にする
		if (isOfflineMode || !videoData) return;

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
