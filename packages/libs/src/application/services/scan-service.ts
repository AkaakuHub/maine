import type { ChapterSkipRule } from "../../domain/settings/chapterSkipRule";
import type { ScanSettings } from "../../domain/scan/scanSettings";
import type {
	ScanScheduleSettings,
	SchedulerStatus,
} from "../../domain/scan/scanSchedule";
import { getAppRuntime } from "../runtime";
import { toSafeDate } from "../../components/scan/utils/timeFormatters";

interface ChapterSkipRulesResponse {
	success: boolean;
	data: ChapterSkipRule[];
	error?: string;
}

interface ChapterSkipRuleResponse {
	success: boolean;
	data: ChapterSkipRule;
	error?: string;
}

interface ScanSettingsResponse {
	success: boolean;
	settings: ScanSettings;
	error?: string;
}

interface ScanScheduleResponse {
	success: boolean;
	settings: ScanScheduleSettings;
	status?: RawSchedulerStatus;
	error?: string;
}

interface ScanControlResponse {
	success: boolean;
	message?: string;
	error?: string;
}

interface RawSchedulerStatus {
	isEnabled: boolean;
	isRunning: boolean;
	nextExecution: string | null;
	lastExecution: string | null;
	lastExecutionStatus: "completed" | "failed" | "cancelled" | "timeout" | null;
	currentExecutionStartTime: string | null;
}

function convertSchedulerStatus(
	status: RawSchedulerStatus | undefined,
): SchedulerStatus | null {
	if (!status) {
		return null;
	}

	return {
		...status,
		nextExecution: toSafeDate(status.nextExecution),
		lastExecution: toSafeDate(status.lastExecution),
		currentExecutionStartTime: toSafeDate(status.currentExecutionStartTime),
	};
}

export async function fetchChapterSkipRules(): Promise<ChapterSkipRule[]> {
	const result =
		await getAppRuntime().http.requestJson<ChapterSkipRulesResponse>({
			path: "/settings/chapter-skip",
			errorMessage: "チャプタースキップルールの取得に失敗しました",
		});

	if (!result.success) {
		throw new Error(
			result.error || "チャプタースキップルールの取得に失敗しました",
		);
	}

	return result.data;
}

export async function createChapterSkipRule(input: {
	pattern: string;
	enabled: boolean;
}): Promise<ChapterSkipRule> {
	const result =
		await getAppRuntime().http.requestJson<ChapterSkipRuleResponse>({
			path: "/settings/chapter-skip",
			init: {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			},
			errorMessage: "チャプタースキップルールの作成に失敗しました",
		});

	if (!result.success) {
		throw new Error(
			result.error || "チャプタースキップルールの作成に失敗しました",
		);
	}

	return result.data;
}

export async function updateChapterSkipRule(
	id: string,
	updates: { pattern?: string; enabled?: boolean },
): Promise<ChapterSkipRule> {
	const result =
		await getAppRuntime().http.requestJson<ChapterSkipRuleResponse>({
			path: `/settings/chapter-skip/${encodeURIComponent(id)}`,
			init: {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			},
			errorMessage: "チャプタースキップルールの更新に失敗しました",
		});

	if (!result.success) {
		throw new Error(
			result.error || "チャプタースキップルールの更新に失敗しました",
		);
	}

	return result.data;
}

export async function deleteChapterSkipRule(id: string): Promise<void> {
	const result = await getAppRuntime().http.requestJson<{
		success: boolean;
		error?: string;
	}>({
		path: `/settings/chapter-skip?id=${encodeURIComponent(id)}`,
		init: {
			method: "DELETE",
		},
		errorMessage: "チャプタースキップルールの削除に失敗しました",
	});

	if (!result.success) {
		throw new Error(
			result.error || "チャプタースキップルールの削除に失敗しました",
		);
	}
}

export async function fetchScanSettings(): Promise<ScanSettings> {
	const result = await getAppRuntime().http.requestJson<ScanSettingsResponse>({
		path: "/scan/settings",
		errorMessage: "スキャン設定の取得に失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "スキャン設定の取得に失敗しました");
	}

	return result.settings;
}

export async function saveScanSettings(
	settings: ScanSettings,
): Promise<ScanSettings> {
	const result = await getAppRuntime().http.requestJson<ScanSettingsResponse>({
		path: "/scan/settings",
		init: {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(settings),
		},
		errorMessage: "スキャン設定の保存に失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "スキャン設定の保存に失敗しました");
	}

	return result.settings;
}

export async function resetScanSettings(): Promise<ScanSettings> {
	const result = await getAppRuntime().http.requestJson<ScanSettingsResponse>({
		path: "/scan/settings",
		init: {
			method: "PUT",
		},
		errorMessage: "スキャン設定のリセットに失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "スキャン設定のリセットに失敗しました");
	}

	return result.settings;
}

export async function fetchScanSchedule(): Promise<{
	settings: ScanScheduleSettings;
	status: SchedulerStatus | null;
}> {
	const result = await getAppRuntime().http.requestJson<ScanScheduleResponse>({
		path: "/scan/schedule",
		errorMessage: "スケジュール設定の取得に失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "スケジュール設定の取得に失敗しました");
	}

	return {
		settings: result.settings,
		status: convertSchedulerStatus(result.status),
	};
}

export async function saveScanSchedule(
	settings: ScanScheduleSettings,
): Promise<{
	settings: ScanScheduleSettings;
	status: SchedulerStatus | null;
}> {
	const result = await getAppRuntime().http.requestJson<ScanScheduleResponse>({
		path: "/scan/schedule",
		init: {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(settings),
		},
		errorMessage: "スケジュール設定の保存に失敗しました",
	});

	if (!result.success) {
		throw new Error(result.error || "スケジュール設定の保存に失敗しました");
	}

	return {
		settings: result.settings,
		status: convertSchedulerStatus(result.status),
	};
}

export async function sendScanControl(
	action: "pause" | "resume" | "cancel",
	scanId: string,
): Promise<boolean> {
	const result = await getAppRuntime().http.requestJson<ScanControlResponse>({
		path: "/scan/control",
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				action,
				scanId,
			}),
		},
		errorMessage: `スキャンの${action}に失敗しました`,
	});

	return result.success;
}
