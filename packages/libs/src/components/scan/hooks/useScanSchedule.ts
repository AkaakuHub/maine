import { useState, useEffect, useCallback } from "react";
import {
	type ScanScheduleSettings,
	type SchedulerStatus,
	DEFAULT_SCHEDULE_SETTINGS,
} from "../../../types/scanScheduleSettings";
import type { Message } from "../types";
import { toSafeDate } from "../utils/timeFormatters";
import { createApiUrl } from "../../../utils/api";

export function useScanSchedule() {
	const [settings, setSettings] = useState<ScanScheduleSettings>(
		DEFAULT_SCHEDULE_SETTINGS,
	);
	const [status, setStatus] = useState<SchedulerStatus | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<Message | null>(null);

	// 設定とステータスを読み込み
	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch(createApiUrl("/scan/schedule"));
			if (response.ok) {
				const data = await response.json();
				setSettings(data.settings);

				// Convert date strings to Date objects in status
				if (data.status) {
					const convertedStatus: SchedulerStatus = {
						...data.status,
						nextExecution: toSafeDate(data.status.nextExecution),
						lastExecution: toSafeDate(data.status.lastExecution),
						currentExecutionStartTime: toSafeDate(
							data.status.currentExecutionStartTime,
						),
					};
					console.log("[Schedule Debug] Converted status:", {
						original: data.status,
						converted: convertedStatus,
						nextExecutionValid:
							convertedStatus.nextExecution instanceof Date &&
							!Number.isNaN(convertedStatus.nextExecution.getTime()),
					});
					setStatus(convertedStatus);
				}
			} else {
				const error = await response.json();
				setMessage({
					type: "error",
					text: `設定の読み込みに失敗しました: ${error.error}`,
				});
			}
		} catch {
			setMessage({
				type: "error",
				text: "設定の読み込み中にエラーが発生しました",
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	// 設定を保存
	const saveSettings = async () => {
		setIsSaving(true);
		setMessage(null);
		try {
			const response = await fetch(createApiUrl("/scan/schedule"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(settings),
			});

			if (response.ok) {
				const data = await response.json();

				// Convert date strings to Date objects in status
				if (data.status) {
					const convertedStatus: SchedulerStatus = {
						...data.status,
						nextExecution: toSafeDate(data.status.nextExecution),
						lastExecution: toSafeDate(data.status.lastExecution),
						currentExecutionStartTime: toSafeDate(
							data.status.currentExecutionStartTime,
						),
					};
					console.log("[Schedule Debug] Converted status:", {
						original: data.status,
						converted: convertedStatus,
						nextExecutionValid:
							convertedStatus.nextExecution instanceof Date &&
							!Number.isNaN(convertedStatus.nextExecution.getTime()),
					});
					setStatus(convertedStatus);
				}
				setMessage({ type: "success", text: "スケジュール設定を保存しました" });
			} else {
				const error = await response.json();
				setMessage({
					type: "error",
					text: `設定の保存に失敗しました: ${error.error}`,
				});
			}
		} catch {
			setMessage({ type: "error", text: "設定の保存中にエラーが発生しました" });
		} finally {
			setIsSaving(false);
		}
	};

	// 設定値の更新ハンドラー
	const updateSetting = <K extends keyof ScanScheduleSettings>(
		key: K,
		value: ScanScheduleSettings[K],
	) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	// 初回読み込み
	useEffect(() => {
		loadData();
	}, [loadData]);

	// メッセージを自動消去
	useEffect(() => {
		if (message) {
			const timer = setTimeout(() => setMessage(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [message]);

	return {
		settings,
		status,
		isLoading,
		isSaving,
		message,
		saveSettings,
		updateSetting,
	};
}
