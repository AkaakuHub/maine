import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { VideoChapter } from "@/services/chapterService";
import { useChapterSkipStore } from "@/stores/chapterSkipStore";
import { createApiUrl } from "@/utils/api";

interface UseVideoChaptersProps {
	src: string;
	videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface SkippedChapter {
	chapterId: number;
	title: string;
	skippedAt: number;
}

export function useVideoChapters({ src, videoRef }: UseVideoChaptersProps) {
	const [chapters, setChapters] = useState<VideoChapter[]>([]);
	const [isLoadingChapters, setIsLoadingChapters] = useState(false);
	const [skippedChapter, setSkippedChapter] = useState<SkippedChapter | null>(
		null,
	);
	const currentChapterRef = useRef<VideoChapter | null>(null);

	// チャプタースキップ設定を取得（リアルタイムで更新される）
	const chapterSkipStore = useChapterSkipStore();

	// チャプター情報を取得
	useEffect(() => {
		const fetchChapters = async () => {
			if (!src) return;

			try {
				setIsLoadingChapters(true);

				// srcからfilePathを抽出
				const url = new URL(src, window.location.origin);
				const filePath = decodeURIComponent(
					url.pathname.replace(/^\/api\/video\//, "/"),
				);

				const response = await fetch(
					createApiUrl(`/chapters?filePath=${encodeURIComponent(filePath)}`),
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

	// 現在有効なスキップルールをメモ化
	const enabledSkipRules = useMemo(
		() => chapterSkipStore.rules.filter((rule) => rule.enabled),
		[chapterSkipStore.rules],
	);

	// チャプター自動スキップ監視
	useEffect(() => {
		if (chapters.length === 0 || !videoRef.current) {
			return;
		}

		const video = videoRef.current;

		const handleTimeUpdate = () => {
			if (!video) return;

			const currentTime = video.currentTime;
			const currentChapter = chapters.find(
				(chapter) =>
					currentTime >= chapter.startTime && currentTime < chapter.endTime,
			);

			// チャプターが切り替わった時のみ処理
			if (
				currentChapter &&
				currentChapterRef.current?.id !== currentChapter?.id
			) {
				// スキップ判定
				const shouldSkip = enabledSkipRules.some((rule) =>
					currentChapter.title
						.toLowerCase()
						.includes(rule.pattern.toLowerCase()),
				);

				if (shouldSkip) {
					// 次のスキップ対象でないチャプターを探す
					const currentIndex = chapters.findIndex(
						(c) => c.id === currentChapter.id,
					);
					let targetChapter = null;

					// 連続するスキップ対象チャプターを全て飛ばして、スキップ対象でない最初のチャプターを探す
					for (let i = currentIndex + 1; i < chapters.length; i++) {
						const chapter = chapters[i];
						const isSkipTarget = enabledSkipRules.some((rule) =>
							chapter.title.toLowerCase().includes(rule.pattern.toLowerCase()),
						);

						if (!isSkipTarget) {
							targetChapter = chapter;
							break;
						}
					}

					if (targetChapter) {
						// スキップ対象でないチャプターにスキップ
						video.currentTime = targetChapter.startTime;
					} else {
						// 全ての残りチャプターがスキップ対象の場合は動画の最後に移動
						video.currentTime = video.duration - 1;
					}

					// スキップ通知
					setSkippedChapter({
						chapterId: currentChapter.id,
						title: currentChapter.title,
						skippedAt: Date.now(),
					});

					// 3秒後に通知をクリア
					setTimeout(() => {
						setSkippedChapter(null);
					}, 3000);
				}
			}

			// 現在のチャプターを記録（参照用）
			currentChapterRef.current = currentChapter || null;
		};

		video.addEventListener("timeupdate", handleTimeUpdate);

		return () => {
			video.removeEventListener("timeupdate", handleTimeUpdate);
		};
	}, [chapters, videoRef, enabledSkipRules]);

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
		skippedChapter,
		clearSkippedChapter: () => setSkippedChapter(null),
	};
}
