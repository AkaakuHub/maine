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
			limit: Number.parseInt(searchParams.get("limit") || "50", 10),
		};

		// サービス層を使用してデータを取得
		const result = await AnimeService.getAnimes(filters, sorting, pagination);

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
