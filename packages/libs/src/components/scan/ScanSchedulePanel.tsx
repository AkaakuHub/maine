"use client";

import { Save, Loader2, Calendar } from "lucide-react";
import { cn } from "../../libs/utils";
import type { ScanSchedulePanelProps } from "./types";
import { useScanSchedule } from "./hooks/useScanSchedule";
import { MessageDisplay } from "./components/MessageDisplay";
import { ScheduleStatus } from "./components/ScheduleStatus";
import { ScheduleSettings } from "./components/ScheduleSettings";

/**
 * スキャンスケジュール設定パネルコンポーネント
 */
export function ScanSchedulePanel({ className }: ScanSchedulePanelProps) {
	const {
		settings,
		status,
		isLoading,
		isSaving,
		message,
		saveSettings,
		updateSetting,
	} = useScanSchedule();

	if (isLoading) {
		return (
			<div
				className={cn(
					"bg-surface rounded-lg border border-border p-6",
					className,
				)}
			>
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
					<span className="ml-2 text-text-secondary">
						スケジュール設定を読み込み中...
					</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"bg-surface rounded-lg border border-border p-6",
				className,
			)}
		>
			{/* ヘッダー */}
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
					<Calendar className="h-5 w-5" />
					定期実行スケジュール
				</h3>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={saveSettings}
						disabled={isSaving}
						className="text-text-inverse flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
					>
						{isSaving ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<Save className="h-3 w-3" />
						)}
						保存
					</button>
				</div>
			</div>

			{/* メッセージ表示 */}
			{message && <MessageDisplay message={message} />}

			{/* スケジュール状態表示 */}
			{status && <ScheduleStatus status={status} />}

			{/* 設定項目 */}
			<ScheduleSettings settings={settings} updateSetting={updateSetting} />
		</div>
	);
}
