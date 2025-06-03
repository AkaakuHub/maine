import { prisma } from "@/libs/prisma";
import type { VideoData } from "@/type";

// Prisma types - define locally if @prisma/client is not available
type PrismaVideo = {
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

export interface VideoFilters {
	search?: string;
	genre?: string;
	year?: string;
}

export interface VideoSorting {
	sortBy: "title" | "year" | "episode" | "createdAt" | "lastWatched";
	sortOrder: "asc" | "desc";
}

export interface VideoPagination {
	page: number;
	limit: number;
}

export interface VideoQueryResult {
	videos: VideoData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export class VideoService {
	/**
	 * アニメデータを検索・フィルタリング・ソートして取得
	 */
	static async getVideos(
		filters: VideoFilters,
		sorting: VideoSorting,
		pagination: VideoPagination,
	): Promise<VideoQueryResult> {
		const where = this.buildWhereClause(filters);
		const orderBy = this.buildOrderByClause(sorting);
		// 軽量化のため、必要な最小限のフィールドのみを選択
		const selectFields = {
			id: true,
			title: true,
			fileName: true,
			filePath: true,
			duration: true,
			thumbnail: true,
			episode: true,
			season: true,
			genre: true,
			year: true,
			lastWatched: true,
			watchTime: true,
			watchProgress: true,
			isLiked: true,
			likedAt: true,
			createdAt: true,
		};

		const [videos, totalCount] = await Promise.all([
			prisma.video.findMany({
				where,
				orderBy,
				skip: (pagination.page - 1) * pagination.limit,
				take: pagination.limit,
				select: selectFields,
			}),
			prisma.video.count({ where }),
		]);
		// fileSizeを除去し、軽量化
		const serializedVideos = videos.map((video: any) => ({
			...video,
			fileSize: "0", // パフォーマンス向上のため固定値
		}));

		return {
			videos: serializedVideos,
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
	static async getVideoById(id: string): Promise<VideoData | null> {
		const video = await prisma.video.findUnique({
			where: { id },
		});

		if (!video) return null;

		return {
			...video,
			fileSize: video.fileSize?.toString() || "0",
		};
	}

	/**
	 * アニメの視聴時間を更新
	 */
	static async updateWatchTime(id: string, watchTime: number): Promise<void> {
		await prisma.video.update({
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
		await prisma.video.update({
			where: { id },
			data: { rating },
		});
	}
	/**
	 * WHERE句を構築
	 */
	private static buildWhereClause(filters: VideoFilters): WhereInput {
		const where: WhereInput = {};

		if (filters.search) {
			// 部分文字列検索の最適化
			const searchTerm = filters.search.trim();
			if (searchTerm.length >= 2) {
				// 最低2文字以上で検索
				where.OR = [
					{ title: { contains: searchTerm } },
					{ fileName: { contains: searchTerm } },
				];
			}
		}

		if (filters.genre) {
			where.genre = { contains: filters.genre };
		}

		if (filters.year) {
			const yearNum = Number.parseInt(filters.year, 10);
			if (!Number.isNaN(yearNum)) {
				where.year = yearNum;
			}
		}

		return where;
	}

	/**
	 * ORDER BY句を構築
	 */
	private static buildOrderByClause(sorting: VideoSorting): OrderByInput {
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
