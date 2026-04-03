"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlaylistData, PlaylistVideo } from "../types/Playlist";
import { fetchPlaylistVideos as fetchPlaylistVideosQuery } from "../application/services/video-service";

interface UsePlaylistVideosReturn {
	playlist: PlaylistData | null;
	videos: PlaylistVideo[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function usePlaylistVideos(playlistId: string): UsePlaylistVideosReturn {
	const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
	const [videos, setVideos] = useState<PlaylistVideo[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchPlaylistVideos = useCallback(async () => {
		if (!playlistId) return;

		try {
			setLoading(true);
			setError(null);
			const data = await fetchPlaylistVideosQuery(playlistId);
			if (data.success) {
				setPlaylist(data.playlist);
				setVideos(data.videos);
			} else {
				throw new Error(data.error || "Failed to fetch playlist videos");
			}
		} catch (err) {
			console.error("Failed to fetch playlist videos:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, [playlistId]);

	useEffect(() => {
		if (playlistId) {
			fetchPlaylistVideos();
		}
	}, [fetchPlaylistVideos, playlistId]);

	const refetch = useCallback(async () => {
		await fetchPlaylistVideos();
	}, [fetchPlaylistVideos]);

	return {
		playlist,
		videos,
		loading,
		error,
		refetch,
	};
}
