"use client";

import type { VideoInfoType } from "../../types/VideoInfo";

interface RelatedVideosProps {
	videoInfo: VideoInfoType;
	isMobile?: boolean;
}

export default function RelatedVideos({
	videoInfo: _videoInfo,
	isMobile: _isMobile = false,
}: RelatedVideosProps) {
	// 関連動画機能は現在利用できません
	return null;
}
