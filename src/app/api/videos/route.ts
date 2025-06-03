import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { VideoService } from "@/services/videoService";
import type {
	VideoFilters,
	VideoSorting,
	VideoPagination,
} from "@/services/videoService";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// 明示的な検索要求をチェック
		const loadAll = searchParams.get("loadAll") === "true";
		const hasSearchFilters =
			searchParams.has("search") ||
			searchParams.has("genre") ||
			searchParams.has("year");

		// デバッグログ
		console.log("[API] Request params:", {
			loadAll,
			hasSearchFilters,
			search: searchParams.get("search"),
			genre: searchParams.get("genre"),
			year: searchParams.get("year"),
		});

		// 検索クエリもloadAllフラグもない場合は空の結果を返す
		if (!loadAll && !hasSearchFilters) {
			console.log("[API] No search conditions - returning empty result");
			return NextResponse.json({
				videos: [],
				pagination: {
					page: 1,
					limit: 50,
					total: 0,
					totalPages: 0,
				},
			});
		}

		// パラメータを解析
		const filters: VideoFilters = {
			search: searchParams.get("search") || undefined,
			genre: searchParams.get("genre") || undefined,
			year: searchParams.get("year") || undefined,
		};

		const sorting: VideoSorting = {
			sortBy: (searchParams.get("sortBy") as VideoSorting["sortBy"]) || "title",
			sortOrder:
				(searchParams.get("sortOrder") as VideoSorting["sortOrder"]) || "asc",
		};

		const pagination: VideoPagination = {
			page: Number.parseInt(searchParams.get("page") || "1", 10),
			limit: Number.parseInt(searchParams.get("limit") || "20", 10), // デフォルトを20に削減
		};

		// サービス層を使用してデータを取得
		const result = await VideoService.getVideos(filters, sorting, pagination);

		console.log("[API] Returning result:", {
			videoCount: result.videos.length,
			total: result.pagination.total,
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Get videos error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch videos",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
