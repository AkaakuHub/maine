import { videoCacheService } from "@/services/videoCacheService";
import { NextResponse } from "next/server";

export async function POST() {
	try {
		console.log("手動フルDBリフレッシュ開始...");
		await videoCacheService.manualRefresh();

		const status = videoCacheService.getUpdateStatus();

		return NextResponse.json({
			success: true,
			message: "フルDB更新が完了しました",
			totalFiles: status.cacheSize,
			memoryUsage: "数KB (DB使用)",
		});
	} catch (error) {
		console.error("手動DBリフレッシュ失敗:", error);
		return NextResponse.json(
			{ error: "DB更新に失敗しました" },
			{ status: 500 },
		);
	}
}
