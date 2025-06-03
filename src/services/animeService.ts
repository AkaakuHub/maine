import { prisma } from "@/libs/prisma";
import type { AnimeData } from "@/type";

// Prisma types - define locally if @prisma/client is not available
type PrismaAnime = {
	id: string;
	title: string;
	fileName: string;
	filePath: string;
	duration?: number | null;
	fileSize?: bigint | null;
	thumbnail?: string | null;
	episode?: number | null;
	season?: string | null;
	genre?: string | null;
	year?: number | null;
	rating?: number | null;
	lastWatched?: Date | null;
	watchTime?: number | null;
	createdAt: Date;
	updatedAt: Date;
};

type WhereInput = {
	OR?: Array<{
		title?: { contains: string };
		fileName?: { contains: string };
	}>;
	genre?: { contains: string };
	year?: number;
};

type OrderByInput = {
	title?: "asc" | "desc";
	year?: "asc" | "desc";
	episode?: "asc" | "desc";
	createdAt?: "asc" | "desc";
	lastWatched?: "asc" | "desc";
};

export interface AnimeFilters {
	search?: string;
	genre?: string;
	year?: string;
}

export interface AnimeSorting {
	sortBy: "title" | "year" | "episode" | "createdAt" | "lastWatched";
	sortOrder: "asc" | "desc";
}

export interface AnimePagination {
	page: number;
	limit: number;
}

export interface AnimeQueryResult {
	animes: AnimeData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export class AnimeService {
	/**
	 * アニメデータを検索・フィルタリング・ソートして取得
	 */
	static async getAnimes(
		filters: AnimeFilters,
		sorting: AnimeSorting,
		pagination: AnimePagination,
	): Promise<AnimeQueryResult> {
		const where = this.buildWhereClause(filters);
		const orderBy = this.buildOrderByClause(sorting);

		const [animes, totalCount] = await Promise.all([
			prisma.anime.findMany({
				where,
				orderBy,
				skip: (pagination.page - 1) * pagination.limit,
				take: pagination.limit,
				select: {
					id: true,
					title: true,
					fileName: true,
					filePath: true,
					duration: true,
					fileSize: true,
					thumbnail: true,
					episode: true,
					season: true,
					genre: true,
					year: true,
					rating: true,
					lastWatched: true,
					watchTime: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			prisma.anime.count({ where }),
		]);

		const serializedAnimes = animes.map((anime: PrismaAnime) => ({
			...anime,
			fileSize: anime.fileSize?.toString() || "0",
		}));

		return {
			animes: serializedAnimes,
			pagination: {
				page: pagination.page,
				limit: pagination.limit,
				total: totalCount,
				totalPages: Math.ceil(totalCount / pagination.limit),
			},
		};
	}

	/**
	 * 単一のアニメデータを取得
	 */
	static async getAnimeById(id: string): Promise<AnimeData | null> {
		const anime = await prisma.anime.findUnique({
			where: { id },
		});

		if (!anime) return null;

		return {
			...anime,
			fileSize: anime.fileSize?.toString() || "0",
		};
	}

	/**
	 * アニメの視聴時間を更新
	 */
	static async updateWatchTime(id: string, watchTime: number): Promise<void> {
		await prisma.anime.update({
			where: { id },
			data: {
				watchTime,
				lastWatched: new Date(),
			},
		});
	}

	/**
	 * アニメの評価を更新
	 */
	static async updateRating(id: string, rating: number): Promise<void> {
		await prisma.anime.update({
			where: { id },
			data: { rating },
		});
	}

	/**
	 * WHERE句を構築
	 */
	private static buildWhereClause(filters: AnimeFilters): WhereInput {
		const where: WhereInput = {};

		if (filters.search) {
			where.OR = [
				{ title: { contains: filters.search } },
				{ fileName: { contains: filters.search } },
			];
		}

		if (filters.genre) {
			where.genre = { contains: filters.genre };
		}

		if (filters.year) {
			where.year = Number.parseInt(filters.year, 10);
		}

		return where;
	}

	/**
	 * ORDER BY句を構築
	 */
	private static buildOrderByClause(sorting: AnimeSorting): OrderByInput {
		const orderBy: OrderByInput = {};

		switch (sorting.sortBy) {
			case "title":
				orderBy.title = sorting.sortOrder;
				break;
			case "year":
				orderBy.year = sorting.sortOrder;
				break;
			case "episode":
				orderBy.episode = sorting.sortOrder;
				break;
			case "createdAt":
				orderBy.createdAt = sorting.sortOrder;
				break;
			case "lastWatched":
				orderBy.lastWatched = sorting.sortOrder;
				break;
			default:
				orderBy.title = "asc";
		}

		return orderBy;
	}
}
