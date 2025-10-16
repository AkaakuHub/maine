"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { VideoInfoType } from "@/types/VideoInfo";
import type { VideoFileData } from "@/type";
import { useVideoProgress } from "./useVideoProgress";
import { useNetworkStatus } from "./useNetworkStatus";
import { useNavigationRefresh } from "@/contexts/NavigationRefreshContext";
import { createApiUrl } from "@/utils/api";

export function useVideoPlayer({
	videoId: explicitVideoId,
}: { videoId?: string } = {}) {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const explicitOfflineMode = searchParams.get("offline") === "true";
	const { isOnline } = useNetworkStatus();
	const { triggerVideoRefresh } = useNavigationRefresh();

	// オフラインモードの判定: 明示的なオフラインモード or ネットワーク切断時
	const isOfflineMode = explicitOfflineMode || !isOnline;

	const [videoData, setVideoData] = useState<VideoFileData | null>(null);
	const [videoInfo, setVideoInfo] = useState<VideoInfoType>({
		title: "",
		episode: "",
		fullTitle: "",
		filePath: "",
		videoId: "",
	});
	const [videoSrc, setVideoSrc] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [showDescription, setShowDescription] = useState<boolean>(false);
	const [isLiked, setIsLiked] = useState<boolean>(false);
	const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);

	// ビデオ進捗管理（ページ離脱時のみ保存）
	const videoProgressHook = useVideoProgress({
		filePath: videoData?.filePath || "",
		enableBackup: !isOfflineMode,
		onProgressSaved: () => {},
	});

	// videoIdで動画を読み込む関数
	const loadVideoByVideoId = useCallback(async (id: string) => {
		try {
			const response = await fetch(createApiUrl(`/videos/by-video-id/${id}`));

			if (!response.ok) {
				throw new Error(`Failed to fetch video: ${response.status}`);
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || "Video not found");
			}

			const videoData: VideoFileData = data.video;
			setVideoData(videoData);
			setVideoInfo({
				title: videoData.title,
				episode: videoData.episode?.toString() || "",
				fullTitle: videoData.title,
				filePath: videoData.filePath,
				videoId: videoData.videoId,
				description: "",
				genre: videoData.genre || "動画",
				year: videoData.year?.toString() || "不明",
				duration: videoData.duration ? `${videoData.duration}秒` : "不明",
			});

			// 動画URLを生成
			const videoUrl = createApiUrl(`/video/${id}`);
			setVideoSrc(videoUrl);

			// いいね状態とウォッチリスト状態を設定
			setIsLiked(videoData.isLiked);
			setIsInWatchlist(videoData.isInWatchlist);

			console.log("Video loaded successfully by videoId:", videoData.title);
		} catch (error) {
			console.error("Error loading video by videoId:", error);
			throw error;
		}
	}, []);

	const initializePlayer = useCallback(async () => {
		const rawVideoId = explicitVideoId ?? params.videoId;
		const currentVideoId = Array.isArray(rawVideoId)
			? rawVideoId[0]
			: rawVideoId;

		if (!currentVideoId) {
			console.error("No videoId provided");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		try {
			// videoId方式のみ
			console.log("Loading video by videoId:", currentVideoId);
			await loadVideoByVideoId(currentVideoId);
		} catch (error) {
			console.error("Failed to load video:", error);
		} finally {
			setIsLoading(false);
		}
	}, [explicitVideoId, params.videoId, loadVideoByVideoId]);

	useEffect(() => {
		initializePlayer();
	}, [initializePlayer]);

	// ビデオの時間更新ハンドラー（新しいuseVideoProgressフックを使用）
	const handleTimeUpdate = useCallback(
		(currentTime: number, duration: number) => {
			// オフラインモードでは進捗を保存しない
			if (isOfflineMode || !videoData || !duration) return;

			// 新しいフックのhandleTimeUpdateを呼び出し
			videoProgressHook.handleTimeUpdate(currentTime, duration);
		},
		[isOfflineMode, videoData, videoProgressHook],
	);

	const handleGoBack = () => {
		triggerVideoRefresh();
		router.back();
	};

	const handleGoHome = () => {
		triggerVideoRefresh();
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
		// オフラインモードではLike機能を無効にする
		if (isOfflineMode || !videoData) return;

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
		if (!videoData?.videoId) {
			console.error("No video data or video ID available");
			return;
		}

		try {
			// ダウンロードリンクを作成（videoIdを使用）
			const downloadUrl = createApiUrl(
				`/video/${videoData.videoId}?download=true`,
			);
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
		// 進捗保存の状態とエラー情報も公開
		progressLoading: videoProgressHook.loading,
		progressError: videoProgressHook.error,
		hasUnsavedProgress: videoProgressHook.hasUnsavedChanges,
	};
}
