import { useCallback } from "react";
import type { VideoFileData } from "../type";

interface UseVideoActionsProps {
	refetchVideos: () => Promise<void>;
	videos: VideoFileData[];
	searchQuery: string;
}

export function useVideoActions({
	refetchVideos,
	videos,
	searchQuery,
}: UseVideoActionsProps) {
	const handleRetry = useCallback(async () => {
		await refetchVideos();
	}, [refetchVideos]);

	const hasContent = videos.length > 0 || Boolean(searchQuery);

	return {
		handleRetry,
		hasContent,
	};
}
