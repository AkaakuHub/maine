import { videoCacheService } from "@/services/videoCacheService";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const checkResult = await videoCacheService.checkAndUpdateIfNeeded();
		const status = videoCacheService.getUpdateStatus();

		return NextResponse.json({
			success: true,
			isUpdating: status.isUpdating,
			progress: status.progress,
			message: status.message,
			memoryUsage: "数KB (DB使用)",
			updated: checkResult.updated,
			checkMessage: checkResult.message,
		});
	} catch (error) {
		console.error("更新状況取得エラー:", error);
		return NextResponse.json(
			{ error: "更新状況の取得に失敗しました" },
			{ status: 500 },
		);
	}
}
