import { useState, useEffect, useCallback } from "react";
import type { VideoChapter } from "@/services/chapterService";

interface UseVideoChaptersProps {
	src: string;
	videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useVideoChapters({ src, videoRef }: UseVideoChaptersProps) {
	const [chapters, setChapters] = useState<VideoChapter[]>([]);
	const [isLoadingChapters, setIsLoadingChapters] = useState(false);

	// チャプター情報を取得
	useEffect(() => {
		const fetchChapters = async () => {
			if (!src) return;

			try {
				setIsLoadingChapters(true);

				// srcからfilePathを抽出
				const url = new URL(src, window.location.origin);
				const filePath = decodeURIComponent(
					url.pathname.replace("/api/video/", ""),
				);

				const response = await fetch(
					`/api/chapters?filePath=${encodeURIComponent(filePath)}`,
				);

				if (response.ok) {
					const data = await response.json();
					if (data.success && data.chapters) {
						setChapters(data.chapters);
					}
				}
			} catch (error) {
				console.error("Failed to fetch chapters:", error);
			} finally {
				setIsLoadingChapters(false);
			}
		};

		fetchChapters();
	}, [src]);

	// 時間指定でのシーク（チャプター移動用）
	const seekToTime = useCallback(
		(time: number) => {
			const video = videoRef.current;
			if (video) {
				video.currentTime = time;
			}
		},
		[videoRef],
	);

	// 現在のチャプターを取得
	const getCurrentChapter = useCallback(() => {
		if (chapters.length === 0 || !videoRef.current) return null;

		const currentTime = videoRef.current.currentTime;
		return (
			chapters.find(
				(chapter) =>
					currentTime >= chapter.startTime && currentTime <= chapter.endTime,
			) || null
		);
	}, [chapters, videoRef]);

	return {
		chapters,
		isLoadingChapters,
		hasChapters: chapters.length > 0,
		seekToTime,
		getCurrentChapter,
	};
}
