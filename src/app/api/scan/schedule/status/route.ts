/**
 * スキャンスケジューラー状態API
 * GET: 現在のスケジューラー状態を取得
 */
import { NextResponse } from "next/server";
import { videoCacheService } from "@/services/videoCacheService";

/**
 * スケジューラー状態を取得
 */
export async function GET() {
	try {
		const scheduler = videoCacheService.getScheduler();
		const status = scheduler.getStatus();
		const settings = scheduler.getSettings();

		// 次回実行までの時間を計算
		let timeUntilNext: number | null = null;
		if (status.nextExecution) {
			timeUntilNext = status.nextExecution.getTime() - Date.now();
			timeUntilNext = Math.max(0, timeUntilNext); // 負の値は0に
		}

		// 現在の実行時間を計算
		let currentExecutionDuration: number | null = null;
		if (status.currentExecutionStartTime) {
			currentExecutionDuration =
				Date.now() - status.currentExecutionStartTime.getTime();
		}

		return NextResponse.json({
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
		});
	} catch (error) {
		console.error("スケジューラー状態取得エラー:", error);
		return NextResponse.json(
			{
				success: false,
				error: "スケジューラー状態の取得に失敗しました",
			},
			{ status: 500 },
		);
	}
}
