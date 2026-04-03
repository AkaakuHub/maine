import { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_SCHEDULE_SETTINGS,
	type ScanScheduleSettings,
	type SchedulerStatus,
} from "../../../types/scanScheduleSettings";
import type { Message } from "../types";
import {
	fetchScanSchedule,
	saveScanSchedule,
} from "../../../application/services/scan-service";

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
			const data = await fetchScanSchedule();
			setSettings(data.settings);
			setStatus(data.status);
		} catch (error) {
			setMessage({
				type: "error",
				text:
					error instanceof Error
						? `設定の読み込みに失敗しました: ${error.message}`
						: "設定の読み込み中にエラーが発生しました",
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
			const data = await saveScanSchedule(settings);
			setSettings(data.settings);
			setStatus(data.status);
			setMessage({ type: "success", text: "スケジュール設定を保存しました" });
		} catch (error) {
			setMessage({
				type: "error",
				text:
					error instanceof Error
						? `設定の保存に失敗しました: ${error.message}`
						: "設定の保存中にエラーが発生しました",
			});
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
