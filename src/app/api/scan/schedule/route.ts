/**
 * スキャンスケジュール設定API
 * GET: 現在のスケジュール設定を取得
 * POST: スケジュール設定を保存
 * DELETE: スケジュールを無効化
 */
import { type NextRequest, NextResponse } from "next/server";
import { videoCacheService } from "@/services/videoCacheService";
import {
	type ScanScheduleSettings,
	SCHEDULE_SETTINGS_CONSTRAINTS,
} from "@/types/scanScheduleSettings";

/**
 * スケジュール設定を取得
 */
export async function GET() {
	try {
		const scheduler = videoCacheService.getScheduler();
		const settings = scheduler.getSettings();
		const status = scheduler.getStatus();

		return NextResponse.json({
			success: true,
			settings,
			status,
		});
	} catch (error) {
		console.error("スケジュール設定取得エラー:", error);
		return NextResponse.json(
			{
				success: false,
				error: "スケジュール設定の取得に失敗しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * スケジュール設定を保存
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// 設定の検証
		const validationResult = validateScheduleSettings(body);
		if (!validationResult.isValid) {
			return NextResponse.json(
				{
					success: false,
					error: validationResult.error,
				},
				{ status: 400 },
			);
		}

		const settings: ScanScheduleSettings = body;

		// スケジューラーに設定を適用
		const scheduler = videoCacheService.getScheduler();
		await scheduler.updateSettings(settings);

		// 更新後の設定と状態を取得
		const updatedSettings = scheduler.getSettings();
		const status = scheduler.getStatus();

		return NextResponse.json({
			success: true,
			message: "スケジュール設定を保存しました",
			settings: updatedSettings,
			status,
		});
	} catch (error) {
		console.error("スケジュール設定保存エラー:", error);
		return NextResponse.json(
			{
				success: false,
				error: "スケジュール設定の保存に失敗しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * スケジュールを無効化
 */
export async function DELETE() {
	try {
		const scheduler = videoCacheService.getScheduler();

		// 無効化された設定で更新
		const disabledSettings: ScanScheduleSettings = {
			...scheduler.getSettings(),
			enabled: false,
		};

		await scheduler.updateSettings(disabledSettings);

		return NextResponse.json({
			success: true,
			message: "スケジュールを無効化しました",
			settings: scheduler.getSettings(),
			status: scheduler.getStatus(),
		});
	} catch (error) {
		console.error("スケジュール無効化エラー:", error);
		return NextResponse.json(
			{
				success: false,
				error: "スケジュールの無効化に失敗しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * スケジュール設定のバリデーション
 */
function validateScheduleSettings(settings: unknown): {
	isValid: boolean;
	error?: string;
} {
	// 基本型チェック
	if (typeof settings !== "object" || settings === null) {
		return {
			isValid: false,
			error: "設定が正しいオブジェクト形式ではありません",
		};
	}

	// Record型にキャスト
	const settingsObj = settings as Record<string, unknown>;

	// enabled チェック
	if (typeof settingsObj.enabled !== "boolean") {
		return {
			isValid: false,
			error: "enabled は boolean 型である必要があります",
		};
	}

	// interval チェック
	const validIntervals = ["daily", "weekly", "monthly", "custom"];
	if (!validIntervals.includes(settingsObj.interval as string)) {
		return {
			isValid: false,
			error:
				"interval は daily, weekly, monthly, custom のいずれかである必要があります",
		};
	}

	// intervalHours チェック
	if (
		typeof settingsObj.intervalHours !== "number" ||
		settingsObj.intervalHours <
			SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.min ||
		settingsObj.intervalHours > SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.max
	) {
		return {
			isValid: false,
			error: `intervalHours は ${SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.min} から ${SCHEDULE_SETTINGS_CONSTRAINTS.intervalHours.max} の間である必要があります`,
		};
	}

	// executionTime チェック
	if (
		!settingsObj.executionTime ||
		typeof settingsObj.executionTime !== "object" ||
		settingsObj.executionTime === null
	) {
		return {
			isValid: false,
			error:
				"executionTime は hour と minute を含むオブジェクトである必要があります",
		};
	}

	const executionTime = settingsObj.executionTime as Record<string, unknown>;
	if (
		typeof executionTime.hour !== "number" ||
		typeof executionTime.minute !== "number"
	) {
		return {
			isValid: false,
			error:
				"executionTime は hour と minute を含むオブジェクトである必要があります",
		};
	}

	const { hour, minute } = executionTime;
	if (
		hour < SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.hour.min ||
		hour > SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.hour.max
	) {
		return {
			isValid: false,
			error: "hour は 0 から 23 の間である必要があります",
		};
	}

	if (
		minute < SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.minute.min ||
		minute > SCHEDULE_SETTINGS_CONSTRAINTS.executionTime.minute.max
	) {
		return {
			isValid: false,
			error: "minute は 0 から 59 の間である必要があります",
		};
	}

	// weeklyDays チェック
	if (!Array.isArray(settingsObj.weeklyDays)) {
		return { isValid: false, error: "weeklyDays は配列である必要があります" };
	}

	for (const day of settingsObj.weeklyDays) {
		if (
			typeof day !== "number" ||
			day < SCHEDULE_SETTINGS_CONSTRAINTS.weeklyDays.min ||
			day > SCHEDULE_SETTINGS_CONSTRAINTS.weeklyDays.max
		) {
			return {
				isValid: false,
				error: "weeklyDays の各要素は 0 から 6 の数値である必要があります",
			};
		}
	}

	// monthlyDay チェック
	if (
		typeof settingsObj.monthlyDay !== "number" ||
		settingsObj.monthlyDay < SCHEDULE_SETTINGS_CONSTRAINTS.monthlyDay.min ||
		settingsObj.monthlyDay > SCHEDULE_SETTINGS_CONSTRAINTS.monthlyDay.max
	) {
		return {
			isValid: false,
			error: "monthlyDay は 1 から 31 の間である必要があります",
		};
	}

	// skipIfRunning チェック
	if (typeof settingsObj.skipIfRunning !== "boolean") {
		return {
			isValid: false,
			error: "skipIfRunning は boolean 型である必要があります",
		};
	}

	// maxExecutionTimeMinutes チェック
	if (
		typeof settingsObj.maxExecutionTimeMinutes !== "number" ||
		settingsObj.maxExecutionTimeMinutes <
			SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.min ||
		settingsObj.maxExecutionTimeMinutes >
			SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.max
	) {
		return {
			isValid: false,
			error: `maxExecutionTimeMinutes は ${SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.min} から ${SCHEDULE_SETTINGS_CONSTRAINTS.maxExecutionTimeMinutes.max} の間である必要があります`,
		};
	}

	// onlyWhenIdle チェック
	if (typeof settingsObj.onlyWhenIdle !== "boolean") {
		return {
			isValid: false,
			error: "onlyWhenIdle は boolean 型である必要があります",
		};
	}

	return { isValid: true };
}
