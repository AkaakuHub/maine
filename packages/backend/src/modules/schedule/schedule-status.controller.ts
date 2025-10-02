import {
	Controller,
	Get,
	Logger,
	Inject,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { ScanSchedulerService } from "../scan/scan-scheduler.service";

@ApiTags("schedule")
@Controller("scan/schedule/status")
export class ScheduleStatusController {
	private readonly logger = new Logger(ScheduleStatusController.name);

	constructor(
		@Inject(ScanSchedulerService) private readonly scanScheduler: ScanSchedulerService,
	) {}

	@Get()
	@ApiResponse({ status: 200, description: "スケジューラー状態取得" })
	async getScheduleStatus() {
		try {
			this.logger.log("Getting schedule status");

			// スケジューラーの遅延初期化を確実に実行
			await this.scanScheduler.initializeSchedulerIfNeeded();
			const status = this.scanScheduler.getStatus();
			const settings = this.scanScheduler.getSettings();

			// 次回実行までの時間を計算
			let timeUntilNext: number | null = null;
			if (status.nextExecution) {
				timeUntilNext = status.nextExecution.getTime() - Date.now();
				timeUntilNext = Math.max(0, timeUntilNext);
			}

			// 現在の実行時間を計算
			let currentExecutionDuration: number | null = null;
			if (status.currentExecutionStartTime) {
				currentExecutionDuration =
					Date.now() - status.currentExecutionStartTime.getTime();
			}

			return {
				success: true,
				status: {
					...status,
					timeUntilNext,
					currentExecutionDuration,
				},
				settings: {
					enabled: settings.enabled,
					interval: settings.interval,
					intervalHours: settings.intervalHours,
					executionTime: settings.executionTime,
				},
				message: status.isEnabled
					? status.isRunning
						? "スケジューラー実行中"
						: `次回実行: ${status.nextExecution ? "設定済み" : "未設定"}`
					: "スケジューラー無効",
			};
		} catch (error) {
			this.logger.error("Schedule status error:", error);
			return {
				success: false,
				error: "スケジューラー状態の取得に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}