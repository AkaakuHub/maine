"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Save,
	Loader2,
	AlertCircle,
	CheckCircle,
	Info,
	Calendar,
	ToggleLeft,
	ToggleRight,
} from "lucide-react";
import { cn } from "@/libs/utils";
import {
	type ScanScheduleSettings,
	type SchedulerStatus,
	DEFAULT_SCHEDULE_SETTINGS,
	SCHEDULE_SETTINGS_CONSTRAINTS,
	SCHEDULE_INTERVAL_LABELS,
	WEEKDAY_LABELS,
} from "@/types/scanScheduleSettings";

interface ScanSchedulePanelProps {
	className?: string;
}

/**
 * スキャンスケジュール設定パネルコンポーネント
 */
export function ScanSchedulePanel({ className }: ScanSchedulePanelProps) {
	const [settings, setSettings] = useState<ScanScheduleSettings>(
		DEFAULT_SCHEDULE_SETTINGS,
	);
	const [status, setStatus] = useState<SchedulerStatus | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error" | "info";
		text: string;
	} | null>(null);

	// 設定とステータスを読み込み
	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/scan/schedule");
			if (response.ok) {
				const data = await response.json();
				setSettings(data.settings);
				setStatus(data.status);
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
			const response = await fetch("/api/scan/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(settings),
			});

			if (response.ok) {
				const data = await response.json();
				setStatus(data.status);
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

	// 設定値の更新ハンドラー
	const updateSetting = <K extends keyof ScanScheduleSettings>(
		key: K,
		value: ScanScheduleSettings[K],
	) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	// 時刻フォーマット
	const formatTime = (hour: number, minute: number) => {
		return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
	};

	// 次回実行時刻のフォーマット
	const formatNextExecution = (nextExecution: Date | null) => {
		if (!nextExecution) return "なし";

		const now = new Date();
		const diff = nextExecution.getTime() - now.getTime();

		if (diff < 0) return "予定時刻を過ぎています";

		const days = Math.floor(diff / (24 * 60 * 60 * 1000));
		const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
		const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

		if (days > 0) {
			return `${days}日${hours}時間${minutes}分後 (${nextExecution.toLocaleDateString("ja-JP")} ${formatTime(nextExecution.getHours(), nextExecution.getMinutes())})`;
		}

		if (hours > 0) {
			return `${hours}時間${minutes}分後 (${formatTime(nextExecution.getHours(), nextExecution.getMinutes())})`;
		}

		return `${minutes}分後 (${formatTime(nextExecution.getHours(), nextExecution.getMinutes())})`;
	};

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
						className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
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
			{message && (
				<div
					className={cn(
						"flex items-center gap-2 p-3 mb-4 rounded-md border text-sm",
						message.type === "success" &&
							"bg-primary/10 border-primary/20 text-primary",
						message.type === "error" &&
							"bg-error/10 border-error/20 text-error",
						message.type === "info" &&
							"bg-primary/10 border-primary/20 text-text-primary",
					)}
				>
					{message.type === "success" && <CheckCircle className="h-4 w-4" />}
					{message.type === "error" && <AlertCircle className="h-4 w-4" />}
					{message.type === "info" && <Info className="h-4 w-4" />}
					{message.text}
				</div>
			)}

			{/* スケジュール状態表示 */}
			{status && (
				<div className="mb-6 p-4 bg-surface-elevated rounded-lg border">
					<div className="flex items-center justify-between mb-3">
						<h4 className="text-sm font-semibold text-text-primary">
							現在の状態
						</h4>
						<div
							className={`flex items-center gap-2 ${status.isEnabled ? "text-primary" : "text-text-secondary"}`}
						>
							{status.isEnabled ? (
								<ToggleRight className="h-4 w-4" />
							) : (
								<ToggleLeft className="h-4 w-4" />
							)}
							<span className="text-sm">
								{status.isEnabled ? "有効" : "無効"}
							</span>
						</div>
					</div>

					{status.isEnabled && (
						<div className="space-y-2 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-text-secondary">次回実行予定</span>
								<span className="text-text font-medium">
									{formatNextExecution(status.nextExecution)}
								</span>
							</div>

							{status.isRunning && (
								<div className="flex items-center justify-between">
									<span className="text-text-secondary">実行状態</span>
									<div className="flex items-center gap-2 text-primary">
										<Loader2 className="h-3 w-3 animate-spin" />
										<span>実行中</span>
									</div>
								</div>
							)}

							{status.lastExecution && (
								<div className="flex items-center justify-between">
									<span className="text-text-secondary">前回実行</span>
									<div className="flex items-center gap-2">
										<span className="text-text">
											{status.lastExecution.toLocaleDateString("ja-JP")}{" "}
											{formatTime(
												status.lastExecution.getHours(),
												status.lastExecution.getMinutes(),
											)}
										</span>
										<div
											className={`w-2 h-2 rounded-full ${
												status.lastExecutionStatus === "completed"
													? "bg-success"
													: status.lastExecutionStatus === "failed"
														? "bg-error"
														: status.lastExecutionStatus === "timeout"
															? "bg-warning"
															: "bg-text-muted"
											}`}
										/>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* 設定項目 */}
			<div className="space-y-6">
				{/* 基本設定 */}
				<div>
					<h4 className="text-md font-medium text-text-primary mb-3 border-b border-border pb-2">
						基本設定
					</h4>
					<div className="space-y-4">
						{/* 有効/無効切り替え */}
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm font-medium text-text-primary">
									定期実行を有効にする
								</div>
								<div className="text-xs text-text-muted">
									指定した間隔で自動的にスキャンを実行します
								</div>
							</div>
							<button
								type="button"
								onClick={() => updateSetting("enabled", !settings.enabled)}
								className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
									settings.enabled
										? "bg-primary/10 text-primary"
										: "bg-surface-elevated text-text-secondary"
								}`}
							>
								{settings.enabled ? (
									<ToggleRight className="h-5 w-5" />
								) : (
									<ToggleLeft className="h-5 w-5" />
								)}
								<span className="text-sm">
									{settings.enabled ? "有効" : "無効"}
								</span>
							</button>
						</div>

						{/* 実行間隔 */}
						{settings.enabled && (
							<>
								<div className="space-y-2">
									<label
										htmlFor="interval-select"
										className="text-sm font-medium text-text-primary"
									>
										実行間隔
									</label>
									<select
										id="interval-select"
										value={settings.interval}
										onChange={(e) =>
											updateSetting(
												"interval",
												e.target.value as ScanScheduleSettings["interval"],
											)
										}
										className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
									>
										{Object.entries(SCHEDULE_INTERVAL_LABELS).map(
											([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											),
										)}
									</select>
								</div>

								{/* 実行時刻 */}
								<div className="space-y-2">
									<span className="text-sm font-medium text-text-primary">
										実行時刻
									</span>
									<div className="flex items-center gap-2">
										<label htmlFor="execution-hour" className="sr-only">
											時
										</label>
										<input
											id="execution-hour"
											type="number"
											value={settings.executionTime.hour}
											onChange={(e) =>
												updateSetting("executionTime", {
													...settings.executionTime,
													hour: Math.max(
														0,
														Math.min(23, Number(e.target.value)),
													),
												})
											}
											min={0}
											max={23}
											aria-label="実行時刻（時）"
											className="w-16 px-2 py-1 text-sm bg-surface-elevated border border-border rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
										/>
										<span className="text-text-secondary">時</span>
										<label htmlFor="execution-minute" className="sr-only">
											分
										</label>
										<input
											id="execution-minute"
											type="number"
											value={settings.executionTime.minute}
											onChange={(e) =>
												updateSetting("executionTime", {
													...settings.executionTime,
													minute: Math.max(
														0,
														Math.min(59, Number(e.target.value)),
													),
												})
											}
											min={0}
											max={59}
											aria-label="実行時刻（分）"
											className="w-16 px-2 py-1 text-sm bg-surface-elevated border border-border rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
										/>
										<span className="text-text-secondary">分</span>
										<div className="ml-4 text-sm text-text-muted">
											{formatTime(
												settings.executionTime.hour,
												settings.executionTime.minute,
											)}
										</div>
									</div>
								</div>

								{/* 週次設定 */}
								{settings.interval === "weekly" && (
									<div className="space-y-2">
										<span className="text-sm font-medium text-text-primary">
											実行する曜日
										</span>
										<div className="grid grid-cols-7 gap-1">
											{WEEKDAY_LABELS.map((day, index) => (
												<button
													key={day}
													type="button"
													onClick={() => {
														const newDays = settings.weeklyDays.includes(index)
															? settings.weeklyDays.filter((d) => d !== index)
															: [...settings.weeklyDays, index].sort();
														updateSetting("weeklyDays", newDays);
													}}
													className={`p-2 text-xs rounded border transition-colors ${
														settings.weeklyDays.includes(index)
															? "bg-primary text-primary-foreground border-primary"
															: "bg-surface-elevated text-text-secondary border-border hover:bg-surface-hover"
													}`}
												>
													{day.charAt(0)}
												</button>
											))}
										</div>
									</div>
								)}

								{/* 月次設定 */}
								{settings.interval === "monthly" && (
									<div className="space-y-2">
										<label
											htmlFor="monthly-day"
											className="text-sm font-medium text-text-primary"
										>
											実行日
										</label>
										<div className="flex items-center gap-2">
											<input
												id="monthly-day"
												type="number"
												value={settings.monthlyDay}
												onChange={(e) =>
													updateSetting(
														"monthlyDay",
														Math.max(1, Math.min(31, Number(e.target.value))),
													)
												}
												min={1}
												max={31}
												className="w-16 px-2 py-1 text-sm bg-surface-elevated border border-border rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
											/>
											<span className="text-text-secondary">日</span>
										</div>
									</div>
								)}

								{/* カスタム間隔設定 */}
								{settings.interval === "custom" && (
									<div className="space-y-2">
										<label
											htmlFor="custom-interval"
											className="text-sm font-medium text-text-primary"
										>
											実行間隔（時間）
										</label>
										<div className="flex items-center gap-2">
											<input
												id="custom-interval"
												type="number"
												value={settings.intervalHours}
												onChange={(e) =>
													updateSetting(
														"intervalHours",
														Math.max(1, Math.min(672, Number(e.target.value))),
													)
												}
												min={1}
												max={672}
												className="w-20 px-2 py-1 text-sm bg-surface-elevated border border-border rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
											/>
											<span className="text-text-secondary">時間ごと</span>
										</div>
									</div>
								)}
							</>
						)}
					</div>
				</div>

				{/* 詳細設定 */}
				{settings.enabled && (
					<div>
						<h4 className="text-md font-medium text-text-primary mb-3 border-b border-border pb-2">
							詳細設定
						</h4>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-sm font-medium text-text-primary">
										手動実行中はスキップ
									</div>
									<div className="text-xs text-text-muted">
										手動スキャンが実行中の場合、自動実行をスキップします
									</div>
								</div>
								<input
									type="checkbox"
									checked={settings.skipIfRunning}
									onChange={(e) =>
										updateSetting("skipIfRunning", e.target.checked)
									}
									className="w-4 h-4 text-primary bg-surface-elevated border-border rounded focus:ring-primary focus:ring-2"
								/>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="max-execution-time"
									className="text-sm font-medium text-text-primary"
								>
									最大実行時間
								</label>
								<div className="flex items-center gap-2">
									<input
										id="max-execution-time"
										type="number"
										value={settings.maxExecutionTimeMinutes}
										onChange={(e) =>
											updateSetting(
												"maxExecutionTimeMinutes",
												Math.max(30, Math.min(720, Number(e.target.value))),
											)
										}
										min={
											SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.min
										}
										max={
											SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.max
										}
										className="w-20 px-2 py-1 text-sm bg-surface-elevated border border-border rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
									/>
									<span className="text-text-secondary">分</span>
									<div className="text-xs text-text-muted ml-2">
										この時間を超えると自動的にタイムアウトします
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
