import { type NextRequest, NextResponse } from "next/server";
import { videoCacheService } from "@/services/videoCacheService";
import type { ScanSettings } from "@/types/scanSettings";

/**
 * GET /api/scan/settings
 * 現在のスキャン設定を取得
 */
export async function GET() {
	try {
		const settings = videoCacheService.getScanSettings();
		return NextResponse.json({ success: true, settings });
	} catch (error) {
		console.error("Failed to get scan settings:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to get scan settings",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/scan/settings
 * スキャン設定を更新
 */
export async function POST(request: NextRequest) {
	try {
		const settings: Partial<ScanSettings> = await request.json();

		// 設定値を更新
		videoCacheService.updateScanSettings(settings);

		const updatedSettings = videoCacheService.getScanSettings();

		return NextResponse.json({
			success: true,
			message: "Scan settings updated successfully",
			settings: updatedSettings,
		});
	} catch (error) {
		console.error("Failed to update scan settings:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update scan settings",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/scan/settings
 * スキャン設定をデフォルトにリセット
 */
export async function PUT() {
	try {
		videoCacheService.resetScanSettings();
		const resetSettings = videoCacheService.getScanSettings();

		return NextResponse.json({
			success: true,
			message: "Scan settings reset to default",
			settings: resetSettings,
		});
	} catch (error) {
		console.error("Failed to reset scan settings:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to reset scan settings",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
