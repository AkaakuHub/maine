import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AnimeService } from "@/services/animeService";
import type {
	AnimeFilters,
	AnimeSorting,
	AnimePagination,
} from "@/services/animeService";

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
				animes: [],
				pagination: {
					page: 1,
					limit: 50,
					total: 0,
					totalPages: 0,
				},
			});
		}

		// パラメータを解析
		const filters: AnimeFilters = {
			search: searchParams.get("search") || undefined,
			genre: searchParams.get("genre") || undefined,
			year: searchParams.get("year") || undefined,
		};

		const sorting: AnimeSorting = {
			sortBy: (searchParams.get("sortBy") as AnimeSorting["sortBy"]) || "title",
			sortOrder:
				(searchParams.get("sortOrder") as AnimeSorting["sortOrder"]) || "asc",
		};

		const pagination: AnimePagination = {
			page: Number.parseInt(searchParams.get("page") || "1", 10),
			limit: Number.parseInt(searchParams.get("limit") || "20", 10), // デフォルトを20に削減
		};

		// サービス層を使用してデータを取得
		const result = await AnimeService.getAnimes(filters, sorting, pagination);

		console.log("[API] Returning result:", { 
			animeCount: result.animes.length, 
			total: result.pagination.total 
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Get animes error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch animes",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
