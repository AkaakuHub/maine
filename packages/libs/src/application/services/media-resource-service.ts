import { getAppRuntime } from "../runtime";

function buildApiResourceUrl(path: string): string {
	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	const apiBaseUrl = getAppRuntime().apiConfig.getApiBaseUrl();

	if (!apiBaseUrl) {
		throw new Error("API base URL is not configured");
	}

	return `${apiBaseUrl}/api/${cleanPath}`;
}

export function createVideoStreamUrl(videoId: string): string {
	return buildApiResourceUrl(`/video/${videoId}`);
}

export function createVideoDownloadUrl(videoId: string): string {
	return buildApiResourceUrl(`/video/${videoId}?download=true`);
}

export function createThumbnailUrl(thumbnailPath: string): string {
	return buildApiResourceUrl(`/thumbnails/${thumbnailPath}`);
}

export function createScanEventsUrl(): string {
	return buildApiResourceUrl("/scan/events");
}
