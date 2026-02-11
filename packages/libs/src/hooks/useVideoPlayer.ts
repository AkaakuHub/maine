"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigationRefresh } from "../contexts/NavigationRefreshContext";
import type { VideoFileData } from "../type";
import type { VideoInfoType } from "../types/VideoInfo";
import { createApiUrl } from "../utils/api";
import { useVideoProgress } from "./useVideoProgress";
import { AuthAPI } from "../api/auth";
import { usePlaylistVideos } from "./usePlaylists";

export function useVideoPlayer({
	id,
	onGoBack,
	onGoHome,
}: {
	id?: string;
	onGoBack?: () => void;
	onGoHome?: () => void;
} = {}) {
	const { triggerVideoRefresh } = useNavigationRefresh();

	const [videoData, setVideoData] = useState<VideoFileData | null>(null);
	const [videoInfo, setVideoInfo] = useState<VideoInfoType>({
		title: "",
		episode: "",
		fullTitle: "",
		filePath: "",
		id: "",
	});
	const [videoSrc, setVideoSrc] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [showDescription, setShowDescription] = useState<boolean>(false);
	const [isLiked, setIsLiked] = useState<boolean>(false);
	const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// プレイリスト機能
	const {
		playlist,
		videos: playlistVideos,
		loading: playlistLoading,
	} = usePlaylistVideos(videoData?.playlistId || "");

	// ビデオ進捗管理（定期保存 + 離脱時保存）
	const videoProgressHook = useVideoProgress({
		filePath: videoData?.filePath || "",
		enableBackup: true,
		onProgressSaved: () => {
			// 進捗保存時のコールバック（必要に応じて拡張）
		},
	});

	// 説明欄を取得する関数
	const fetchDescription = useCallback(
		async (filePath: string): Promise<string> => {
			try {
				const response = await fetch(
					createApiUrl(`/programInfo?filePath=${encodeURIComponent(filePath)}`),
				);
				if (!response.ok) {
					return "";
				}
				const data = await response.json();
				return data.success ? data.programInfo || "" : "";
			} catch (error) {
				console.error("Error fetching description:", error);
				return "";
			}
		},
		[],
	);

	// idで動画を読み込む関数
	const loadVideoById = useCallback(
		async (id: string) => {
			try {
				setError(null);
				const response = await fetch(createApiUrl(`/videos/by-id/${id}`), {
					headers: AuthAPI.getAuthHeaders(),
				});

				if (!response.ok) {
					// 401/403エラーの場合は権限なしエラーメッセージを設定
					if (response.status === 401) {
						setError("認証が必要です");
						return;
					}
					if (response.status === 403) {
						setError("この動画にアクセスする権限がありません");
						return;
					}
					// 404エラーの場合は特別なエラーメッセージを設定
					if (response.status === 404) {
						setError("Video not found");
						return;
					}
					throw new Error(`Failed to fetch video: ${response.status}`);
				}

				const data = await response.json();

				if (!data.success) {
					// APIのsuccessがfalseの場合も404として扱う
					if (data.error?.includes("not found")) {
						setError("Video not found");
						return;
					}
					throw new Error(data.error || "Video not found");
				}

				const videoData: VideoFileData = data.video;
				setVideoData(videoData);

				// 説明欄を取得
				const description = await fetchDescription(videoData.filePath);

				setVideoInfo({
					title: videoData.title,
					episode: videoData.episode?.toString() || "",
					fullTitle: videoData.title,
					filePath: videoData.filePath,
					id: videoData.id,
					description: description,
					genre: videoData.genre || "動画",
					year: videoData.year?.toString() || "不明",
					duration: videoData.duration ? `${videoData.duration}秒` : "不明",
				});

				// 動画URLを生成
				const videoUrl = createApiUrl(`/video/${id}`);
				setVideoSrc(videoUrl);

				// いいね状態とウォッチリスト状態を設定（デフォルト値）
				setIsLiked(false);
				setIsInWatchlist(false);

				// 進捗データを非同期で読み込み
				videoProgressHook.loadInitialProgress().catch((error) => {
					console.error("Failed to load initial progress:", error);
				});
			} catch (error) {
				console.error("Error loading video by id:", error);
				// ネットワークエラーやその他のエラーの場合
				if (
					!(error instanceof Error) ||
					!error.message?.includes("Video not found")
				) {
					setError("Failed to load video");
				}
			}
		},
		[fetchDescription, videoProgressHook.loadInitialProgress],
	);

	const initializePlayer = useCallback(async () => {
		if (!id) {
			console.error("No id provided");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		try {
			await loadVideoById(id);
		} catch (error) {
			console.error("Failed to load video:", error);
		} finally {
			setIsLoading(false);
		}
	}, [id, loadVideoById]);

	useEffect(() => {
		initializePlayer();
	}, [initializePlayer]);

	// ビデオの時間更新ハンドラー（定期保存＋シーク対応）
	const handleTimeUpdate = useCallback(
		(currentTime: number, duration: number) => {
			if (!videoData || !duration) return;

			// 新しいフックのhandleTimeUpdateを呼び出し（定期保存＋シーク対応）
			videoProgressHook.handleTimeUpdate(currentTime, duration);
		},
		[videoData, videoProgressHook],
	);

	const handleGoBack = () => {
		triggerVideoRefresh();
		onGoBack?.();
	};

	const handleGoHome = () => {
		triggerVideoRefresh();
		onGoHome?.();
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
			if (navigator.clipboard?.writeText && window.isSecureContext) {
				navigator.clipboard.writeText(window.location.href);
				alert("URLがクリップボードにコピーされました！");
			} else {
				console.warn(
					"クリップボードAPIが使用できません（HTTPS接続またはlocalhostでのみ利用可能）",
				);
				alert("クリップボード機能はHTTPS接続またはlocalhostでのみ利用可能です");
			}
		}
	};

	const toggleLike = async () => {
		if (!videoData) return;

		const newLikeStatus = !isLiked;
		setIsLiked(newLikeStatus); // 楽観的更新

		try {
			const success = await videoProgressHook.updateLikeStatus(newLikeStatus);
			if (!success) {
				// 失敗時は元に戻す
				setIsLiked(!newLikeStatus);
				console.error("Failed to update like status");
			}
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
		if (!videoData?.id) {
			console.error("No video data or id available");
			return;
		}

		try {
			const downloadUrl = createApiUrl(`/video/${videoData.id}?download=true`);
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = videoData.fileName || "video.mp4";
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
		error,
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
		// 進捗機能も公開
		loadInitialProgress: videoProgressHook.loadInitialProgress,
		// 進捗保存の状態とエラー情報も公開
		progressLoading: videoProgressHook.loading,
		progressError: videoProgressHook.error,
		hasUnsavedProgress: videoProgressHook.hasUnsavedChanges,
		// プレイリスト機能
		playlist,
		playlistVideos,
		playlistLoading,
	};
}
