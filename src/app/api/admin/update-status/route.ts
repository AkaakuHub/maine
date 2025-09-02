import { videoCacheService } from "@/services/videoCacheService";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const checkResult = await videoCacheService.checkAndUpdateIfNeeded();
		const status = await videoCacheService.getUpdateStatus();

		return NextResponse.json({
			success: true,
			isUpdating: status.isUpdating,
			progress: status.progress,
			lastScanDate: status.lastScanDate,
			daysSinceLastScan: status.daysSinceLastScan,
			totalFiles: status.cacheSize,
			memoryUsage: "数KB (DB使用)",
			needsUpdate: checkResult.needsUpdate,
		});
	} catch (error) {
		console.error("更新状況取得エラー:", error);
		return NextResponse.json(
			{ error: "更新状況の取得に失敗しました" },
			{ status: 500 },
		);
	}
}
