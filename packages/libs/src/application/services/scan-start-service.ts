import { getAppRuntime } from "../runtime";

interface StartScanResponse {
	success: boolean;
	message: string;
	timestamp: string;
	activeConnections: number;
}

export async function startScan(): Promise<StartScanResponse> {
	return getAppRuntime().http.requestJson<StartScanResponse>({
		path: "/scan/start",
		init: {
			method: "POST",
		},
		errorMessage: "スキャンの開始に失敗しました",
	});
}
