import type { PlaylistData, PlaylistVideo } from "../../domain/playlist/models";
import type { VideoFileData } from "../../domain/video/models";
import { getAppRuntime } from "../runtime";
import type { ApiPaginationInfo } from "../support/pagination";

interface VideoListResponse {
	videos: VideoFileData[];
	pagination?: ApiPaginationInfo;
}

interface PlaylistVideosResponse {
	success: boolean;
	playlist: PlaylistData;
	videos: PlaylistVideo[];
	error?: string;
}

interface VideoByIdResponse {
	success: boolean;
	video?: VideoFileData;
	error?: string;
}

interface ProgramInfoResponse {
	success?: boolean;
	programInfo?: string;
}

export async function fetchVideos(
	params: URLSearchParams,
): Promise<VideoListResponse> {
	return getAppRuntime().http.requestJson<VideoListResponse>({
		path: `/videos?${params.toString()}`,
		init: {
			signal: AbortSignal.timeout(30000),
		},
		requiresAuth: true,
		errorMessage: "動画一覧の取得に失敗しました",
	});
}

export async function fetchContinueWatchingVideos(
	params: URLSearchParams,
): Promise<VideoListResponse> {
	return getAppRuntime().http.requestJson<VideoListResponse>({
		path: `/videos/continue?${params.toString()}`,
		init: {
			signal: AbortSignal.timeout(30000),
		},
		requiresAuth: true,
		errorMessage: "視聴途中動画の取得に失敗しました",
	});
}

export async function fetchPlaylistVideos(
	playlistId: string,
): Promise<PlaylistVideosResponse> {
	return getAppRuntime().http.requestJson<PlaylistVideosResponse>({
		path: `/playlists/${playlistId}/videos`,
		requiresAuth: true,
		errorMessage: "プレイリスト動画の取得に失敗しました",
	});
}

export async function fetchVideoById(id: string): Promise<VideoByIdResponse> {
	return getAppRuntime().http.requestJson<VideoByIdResponse>({
		path: `/videos/by-id/${id}`,
		requiresAuth: true,
		errorMessage: "動画詳細の取得に失敗しました",
	});
}

export async function fetchProgramInfo(filePath: string): Promise<string> {
	const data = await getAppRuntime().http.requestJson<ProgramInfoResponse>({
		path: `/programInfo?filePath=${encodeURIComponent(filePath)}`,
		errorMessage: "番組情報の取得に失敗しました",
	});

	return data.success ? data.programInfo || "" : "";
}
