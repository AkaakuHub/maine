"use client";

import { useState, useCallback } from "react";
import type { VideoFileData } from "../type";

export function useWarningDialog() {
	const [showStreamingWarning, setShowStreamingWarning] = useState(false);
	const [warningVideoData, setWarningVideoData] =
		useState<VideoFileData | null>(null);

	const handleShowStreamingWarning = useCallback((video: VideoFileData) => {
		setWarningVideoData(video);
		setShowStreamingWarning(true);
	}, []);

	const handleCloseStreamingWarning = useCallback(() => {
		setShowStreamingWarning(false);
		setWarningVideoData(null);
	}, []);

	const handleContinueStreaming = useCallback(() => {
		if (warningVideoData) {
			handleCloseStreamingWarning();
			setTimeout(() => {
				window.location.href = `/play/${encodeURIComponent(warningVideoData.videoId)}`;
			}, 0);
		}
	}, [warningVideoData, handleCloseStreamingWarning]);

	return {
		showStreamingWarning,
		warningVideoData,
		handleShowStreamingWarning,
		handleCloseStreamingWarning,
		handleContinueStreaming,
	};
}
