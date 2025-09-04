import { ToggleLeft, ToggleRight } from "lucide-react";
import {
	type ScanScheduleSettings,
	SCHEDULE_INTERVAL_LABELS,
	WEEKDAY_LABELS,
	SCHEDULE_SETTINGS_CONSTRAINTS,
} from "@/types/scanScheduleSettings";
import { formatTime } from "../utils/timeFormatters";

interface ScheduleSettingsProps {
	settings: ScanScheduleSettings;
	updateSetting: <K extends keyof ScanScheduleSettings>(
		key: K,
		value: ScanScheduleSettings[K],
	) => void;
}

export function ScheduleSettings({
	settings,
	updateSetting,
}: ScheduleSettingsProps) {
	return (
		<div className="space-y-8">
			{/* 基本設定 */}
			<div className="bg-surface-elevated rounded-xl border border-border/50 shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-surface-elevated to-surface">
					<h4 className="font-semibold text-text-primary">基本設定</h4>
				</div>
				<div className="p-6">
					{/* 有効/無効切り替え */}
					<div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border/20">
						<div>
							<div className="font-medium text-text-primary mb-1">
								定期実行スケジュール
							</div>
							<div className="text-sm text-text-secondary">
								指定した間隔で自動的にスキャンを実行します
							</div>
						</div>
						<button
							type="button"
							onClick={() => updateSetting("enabled", !settings.enabled)}
							className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-200 font-medium ${
								settings.enabled
									? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
									: "bg-surface-elevated text-text-secondary border border-border hover:bg-surface-hover"
							}`}
						>
							{settings.enabled ? (
								<ToggleRight className="h-5 w-5" />
							) : (
								<ToggleLeft className="h-5 w-5" />
							)}
							{settings.enabled ? "有効" : "無効"}
						</button>
					</div>

					{/* スケジュール設定フォーム */}
					{settings.enabled && (
						<div className="mt-6 space-y-6">
							{/* 実行間隔 */}
							<div className="space-y-3">
								<label
									htmlFor="interval-select"
									className="block font-medium text-text-primary"
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
									className="w-full px-4 py-3 bg-surface border border-border/30 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
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
												hour: Math.max(0, Math.min(23, Number(e.target.value))),
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
												className={`text-text-inverse p-2 text-xs rounded border transition-colors ${
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
						</div>
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
	);
}
