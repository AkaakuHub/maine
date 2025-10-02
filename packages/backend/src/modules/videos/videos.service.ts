import { PAGINATION } from "@my-video-storage/shared-utils";
import { Injectable, Logger } from "@nestjs/common";
import type { Prisma, VideoMetadata } from "@prisma/client";
import { PrismaService } from "../../common/database/prisma.service";

export interface VideoData {
	id: string;
	title: string;
	filePath: string;
	fileName: string;
	fileSize: number;
	duration: number | null;
	episode: number | null;
	year: string | null;
	lastModified: Date;
	scannedAt: Date;
	thumbnailPath: string | undefined | null;
	metadataExtractedAt: Date | null;
}

type SearchResult = {
	success: boolean;
	videos: VideoData[];
	totalFound: number;
	message: string;
	error?: string;
};

@Injectable()
export class VideosService {
	private readonly logger = new Logger(VideosService.name);

	constructor(private readonly prisma: PrismaService) {}

	async searchVideos(query: string): Promise<SearchResult> {
		try {
			this.logger.log(`Searching videos with query: "${query}"`);

			// Prismaクエリの構築
			const where: Prisma.VideoMetadataWhereInput = {};

			if (query?.trim()) {
				where.OR = [
					{ title: { contains: query } },
					{ filePath: { contains: query } },
					{ fileName: { contains: query } },
				];
			}

			// 動画データを取得
			const videos = await this.prisma.videoMetadata.findMany({
				where,
				orderBy: [{ title: "asc" }, { scannedAt: "desc" }],
				take: PAGINATION.MAX_LIMIT, // 安全のため最大件数を制限
			});

			this.logger.log(`Found ${videos.length} videos`);

			return {
				success: true,
				videos: videos.map(this.transformVideoData),
				totalFound: videos.length,
				message: `${videos.length}件の動画が見つかりました`,
			};
		} catch (error) {
			this.logger.error("Error searching videos:", error);
			return {
				success: false,
				videos: [],
				totalFound: 0,
				message: "動画の検索に失敗しました",
				error: error instanceof Error ? error.message : "不明なエラー",
			};
		}
	}

	async getVideo(filePath: string): Promise<VideoData | null> {
		try {
			this.logger.log(`Getting video with path: ${filePath}`);

			const video = await this.prisma.videoMetadata.findUnique({
				where: { filePath },
			});

			if (!video) {
				return null;
			}

			return this.transformVideoData(video);
		} catch (error) {
			this.logger.error("Error getting video:", error);
			throw error;
		}
	}

	private transformVideoData(video: VideoMetadata): VideoData {
		return {
			id: video.id,
			title: video.title,
			filePath: video.filePath,
			fileName: video.fileName,
			fileSize: video.fileSize ? Number(video.fileSize) : 0,
			duration: video.duration,
			episode: video.episode,
			year: video.year ? video.year.toString() : null,
			lastModified: video.lastModified,
			scannedAt: video.scannedAt,
			thumbnailPath: video.thumbnail_path,
			metadataExtractedAt: video.metadata_extracted_at,
		};
	}
}
