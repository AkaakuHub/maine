import { Calendar, Loader2 } from "lucide-react";
import type { SchedulerStatus } from "@/types/scanScheduleSettings";
import { SafeDateDisplay } from "@/components/common/SafeDateDisplay";
import { toSafeDate } from "../utils/timeFormatters";

interface ScheduleStatusProps {
	status: SchedulerStatus;
}

export function ScheduleStatus({ status }: ScheduleStatusProps) {
	return (
		<div className="mb-8 overflow-hidden bg-gradient-to-br from-surface-elevated to-surface rounded-xl border border-border/50 shadow-sm">
			{/* ヘッダー */}
			<div className="px-6 py-4 border-b border-border/30 bg-surface-elevated/50">
				<div className="flex items-center justify-between">
					<h4 className="font-medium text-text-primary">スケジュール状態</h4>
				</div>
			</div>

			{/* コンテンツ */}
			<div className="p-6">
				{status.isEnabled ? (
					<div className="grid gap-4">
						{/* 次回実行予定 */}
						<div className="flex items-start justify-between p-4 bg-surface rounded-lg border border-border/20">
							<div>
								<div className="text-sm text-text-secondary mb-1">
									次回実行予定
								</div>
								<div className="font-medium text-text">
									{status.nextExecution ? (
										<SafeDateDisplay
											date={status.nextExecution}
											format="datetime"
										/>
									) : (
										<span className="text-text-muted">
											次回実行は未設定です
										</span>
									)}
								</div>
							</div>
							<Calendar className="h-5 w-5 text-text-muted mt-0.5" />
						</div>

						{/* 実行状態（実行中の場合） */}
						{status.isRunning && (
							<div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
								<div className="flex items-center gap-2 text-primary">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span className="font-medium">実行中</span>
								</div>
							</div>
						)}

						{/* 前回実行結果 */}
						{(() => {
							if (!status.lastExecution) return null;

							const safeLastExecution = toSafeDate(status.lastExecution);
							if (!safeLastExecution) return null;

							return (
								<div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border/20">
									<div>
										<div className="text-sm text-text-secondary mb-1">
											前回実行
										</div>
										<div className="font-medium text-text">
											{safeLastExecution ? (
												<SafeDateDisplay
													date={safeLastExecution}
													format="datetime"
												/>
											) : (
												<span className="text-text-muted">実行履歴なし</span>
											)}
										</div>
									</div>
									<div
										className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
											status.lastExecutionStatus === "completed"
												? "bg-success-bg text-success border border-success"
												: status.lastExecutionStatus === "failed"
													? "bg-error-bg text-error border border-error"
													: status.lastExecutionStatus === "timeout"
														? "bg-warning-bg text-warning border border-warning"
														: "bg-surface-elevated text-text-muted border border-border"
										}`}
									>
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
										{status.lastExecutionStatus === "completed" && "完了"}
										{status.lastExecutionStatus === "failed" && "失敗"}
										{status.lastExecutionStatus === "timeout" && "タイムアウト"}
										{status.lastExecutionStatus === "cancelled" && "キャンセル"}
									</div>
								</div>
							);
						})()}
					</div>
				) : (
					<div className="text-center py-8">
						<div className="text-text-muted mb-2">
							スケジュール機能が無効です
						</div>
						<div className="text-sm text-text-secondary">
							下記の設定で有効化できます
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
