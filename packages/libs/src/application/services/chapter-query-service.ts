import type { VideoChapter } from "../../services/chapterService";
import { getAppRuntime } from "../runtime";

interface ChapterQueryResponse {
	success: boolean;
	chapters?: VideoChapter[];
}

export async function fetchVideoChapters(
	id: string,
): Promise<VideoChapter[] | null> {
	const response = await getAppRuntime().http.request({
		path: `/chapters?id=${encodeURIComponent(id)}`,
	});

	if (response.status === 400 || response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error("チャプター情報の取得に失敗しました");
	}

	const data = (await response.json()) as ChapterQueryResponse;

	if (!data.success || !data.chapters) {
		return null;
	}

	return data.chapters;
}
