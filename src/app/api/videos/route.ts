import { VideoScanService } from "@/services";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// 検索クエリを取得
		const query = searchParams.get("search") || "";

		console.log("[API] Searching videos with query:", query);

		// VideoScanServiceを使用してリアルタイム検索
		const result = await VideoScanService.searchVideos(query);

		if (!result.success) {
			return NextResponse.json(
				{ error: result.message, details: result.error },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			videos: result.videos,
			total: result.totalFound,
			message: result.message,
		});
	} catch (error) {
		console.error("Video search error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
