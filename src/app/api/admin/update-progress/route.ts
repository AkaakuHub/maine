import { videoCacheService } from "@/services/videoCacheService";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const status = await videoCacheService.getUpdateStatus();

		return NextResponse.json({
			success: true,
			progress: status.progress,
			isUpdating: status.isUpdating,
			completed: !status.isUpdating && status.progress === 100,
			totalFiles: status.cacheSize,
			memoryUsage: "数KB (DB使用)",
		});
	} catch (error) {
		console.error("プログレス取得エラー:", error);
		return NextResponse.json(
			{ error: "プログレス取得に失敗しました" },
			{ status: 500 },
		);
	}
}
