import type {
	ProgressData,
	UpdateProgressParams,
} from "../../domain/progress/models";
import { getAppRuntime } from "../runtime";

interface ProgressResponse {
	success: boolean;
	data: ProgressData;
	error?: string;
}

export async function saveVideoProgress(
	params: UpdateProgressParams,
	init?: Pick<RequestInit, "keepalive">,
): Promise<ProgressData> {
	const result = await getAppRuntime().http.requestJson<ProgressResponse>({
		path: "/progress",
		init: {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(params),
			signal: AbortSignal.timeout(30000),
			keepalive: init?.keepalive,
		},
		requiresAuth: true,
		errorMessage: "進捗の保存に失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "進捗の保存に失敗しました");
	}

	return result.data;
}

export async function loadVideoProgress(
	filePath: string,
): Promise<ProgressData> {
	const result = await getAppRuntime().http.requestJson<ProgressResponse>({
		path: `/progress?filePath=${encodeURIComponent(filePath)}`,
		init: {
			signal: AbortSignal.timeout(30000),
		},
		requiresAuth: true,
		errorMessage: "進捗の取得に失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "進捗の取得に失敗しました");
	}

	return result.data;
}
