import { videoCacheService } from "@/services/videoCacheService";
import { NextResponse } from "next/server";

export async function POST() {
	try {
		console.log("手動フルDBリフレッシュ開始...");
		const refreshResult = await videoCacheService.manualRefresh();

		const status = videoCacheService.getUpdateStatus();

		return NextResponse.json({
			success: refreshResult.success,
			message: refreshResult.message,
			status: status.message,
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
