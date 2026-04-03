import { getAppRuntime } from "../runtime";

export async function fetchThumbnailBlob(thumbnailPath: string): Promise<Blob> {
	const response = await getAppRuntime().http.request({
		path: `/thumbnails/${thumbnailPath}`,
		init: { credentials: "include" },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
	}

	return response.blob();
}
