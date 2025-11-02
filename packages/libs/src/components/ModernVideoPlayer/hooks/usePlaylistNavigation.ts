import { useCallback } from "react";
import type { PlaylistVideo } from "../../../types/Playlist";

interface UsePlaylistNavigationProps {
	playlistVideos: PlaylistVideo[];
	currentVideoId?: string;
	onVideoSelect?: (video: PlaylistVideo) => void;
}

interface UsePlaylistNavigationReturn {
	playNextVideo: () => boolean;
	playPreviousVideo: () => boolean;
	getNextVideo: () => PlaylistVideo | null;
	getPreviousVideo: () => PlaylistVideo | null;
	hasNextVideo: boolean;
	hasPreviousVideo: boolean;
	getCurrentVideoIndex: () => number;
}

export function usePlaylistNavigation({
	playlistVideos,
	currentVideoId,
	onVideoSelect,
}: UsePlaylistNavigationProps): UsePlaylistNavigationReturn {
	// 現の動画のインデックスを取得
	const getCurrentVideoIndex = useCallback((): number => {
		if (!currentVideoId || !playlistVideos.length) return -1;
		return playlistVideos.findIndex(
			(video) => video.videoId === currentVideoId,
		);
	}, [currentVideoId, playlistVideos]);

	// 次の動画を取得
	const getNextVideo = useCallback((): PlaylistVideo | null => {
		const currentIndex = getCurrentVideoIndex();
		if (currentIndex === -1) return null;
		const nextIndex = (currentIndex + 1) % playlistVideos.length;
		return playlistVideos[nextIndex];
	}, [playlistVideos, getCurrentVideoIndex]);

	// 前の動画を取得
	const getPreviousVideo = useCallback((): PlaylistVideo | null => {
		const currentIndex = getCurrentVideoIndex();
		if (currentIndex === -1) return null;
		const previousIndex =
			currentIndex === 0 ? playlistVideos.length - 1 : currentIndex - 1;
		return playlistVideos[previousIndex];
	}, [playlistVideos, getCurrentVideoIndex]);

	// 次の動画に進む
	const playNextVideo = useCallback((): boolean => {
		const nextVideo = getNextVideo();
		if (nextVideo && onVideoSelect) {
			onVideoSelect(nextVideo);
			return true;
		}
		return false;
	}, [getNextVideo, onVideoSelect]);

	// 前の動画に戻る
	const playPreviousVideo = useCallback((): boolean => {
		const previousVideo = getPreviousVideo();
		if (previousVideo && onVideoSelect) {
			onVideoSelect(previousVideo);
			return true;
		}
		return false;
	}, [getPreviousVideo, onVideoSelect]);

	// 次の動画があるかどうか
	const hasNextVideo = !!getNextVideo();
	const hasPreviousVideo = !!getPreviousVideo();

	return {
		playNextVideo,
		playPreviousVideo,
		getNextVideo,
		getPreviousVideo,
		hasNextVideo,
		hasPreviousVideo,
		getCurrentVideoIndex,
	};
}
