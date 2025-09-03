import { videoCacheService } from "@/services/videoCacheService";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// 検索クエリを取得
		const query = searchParams.get("search") || "";
		const exactMatch = searchParams.get("exactMatch") === "true";

		console.log("[API] Searching videos with query:", query);
		console.log("[API] Query length:", query.length);
		console.log("[API] Exact match:", exactMatch);

		// 常にsearchVideosを使用（空文字の場合は全件取得、クエリありの場合は検索）
		const searchResult = await videoCacheService.searchVideos(query);

		console.log("[API] Search result success:", searchResult.success);
		console.log(
			"[API] Search result videos count:",
			searchResult.videos.length,
		);

		if (!searchResult.success) {
			console.error(
				"[API] Search failed:",
				searchResult.message,
				searchResult.error,
			);
			return NextResponse.json(
				{ error: searchResult.message, details: searchResult.error },
				{ status: 500 },
			);
		}

		// 完全マッチが要求された場合は、ファイルパスで厳密にフィルタリング
		let filteredVideos = searchResult.videos;
		if (exactMatch && query) {
			console.log("[API] Exact match query:", query);
			console.log("[API] Query length:", query.length);
			console.log("[API] Available video paths:");
			searchResult.videos.forEach((video, index) => {
				console.log(
					`  [${index}] Path: "${video.filePath}" (length: ${video.filePath.length})`,
				);
				console.log(`  [${index}] Match: ${video.filePath === query}`);
			});

			filteredVideos = searchResult.videos.filter(
				(video) => video.filePath === query,
			);
			console.log("[API] Exact match filtered videos:", filteredVideos.length);
		}

		return NextResponse.json({
			videos: filteredVideos,
			total: filteredVideos.length,
			message: searchResult.message,
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
