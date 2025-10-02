import { PAGINATION } from "@my-video-storage/shared-utils";
import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
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
	// 再生進捗情報（DBから取得、デフォルト値0）
	watchProgress: number;
	watchTime: number;
	isLiked: boolean;
	lastWatched?: Date | null;
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

			// 各動画の進捗情報を個別に取得
			const videosWithProgress = await Promise.all(
				videos.map(async (v) => {
					try {
						const progress = await this.prisma.videoProgress.findUnique({
							where: { filePath: v.filePath },
						});
						return {
							id: v.id,
							title: v.title,
							fileName: v.fileName,
							filePath: v.filePath,
							fileSize: v.fileSize ? Number(v.fileSize) : 0,
							lastModified: v.lastModified,
							episode: v.episode,
							year: v.year ? v.year.toString() : null,
							duration: v.duration,
							scannedAt: v.scannedAt,
							thumbnailPath: v.thumbnail_path,
							metadataExtractedAt: v.metadata_extracted_at,
							watchProgress: progress?.watchProgress ?? 0,
							watchTime: progress?.watchTime ?? 0,
							isLiked: progress?.isLiked ?? false,
							lastWatched: progress?.lastWatched ?? undefined,
						};
					} catch (progressError) {
						this.logger.error(
							`Progress error for ${v.filePath}:`,
							progressError,
						);
						return {
							id: v.id,
							title: v.title,
							fileName: v.fileName,
							filePath: v.filePath,
							fileSize: v.fileSize ? Number(v.fileSize) : 0,
							lastModified: v.lastModified,
							episode: v.episode,
							year: v.year ? v.year.toString() : null,
							duration: v.duration,
							scannedAt: v.scannedAt,
							thumbnailPath: v.thumbnail_path,
							metadataExtractedAt: v.metadata_extracted_at,
							watchProgress: 0,
							watchTime: 0,
							isLiked: false,
							lastWatched: undefined,
						};
					}
				}),
			);

			this.logger.log(
				`Returning ${videosWithProgress.length} videos with progress`,
			);

			return {
				success: true,
				videos: videosWithProgress,
				totalFound: videosWithProgress.length,
				message: `${videosWithProgress.length}件の動画が見つかりました`,
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

			// progressデータも取得
			try {
				const progress = await this.prisma.videoProgress.findUnique({
					where: { filePath: video.filePath },
				});

				return {
					id: video.id,
					title: video.title,
					fileName: video.fileName,
					filePath: video.filePath,
					fileSize: video.fileSize ? Number(video.fileSize) : 0,
					lastModified: video.lastModified,
					episode: video.episode,
					year: video.year ? video.year.toString() : null,
					duration: video.duration,
					scannedAt: video.scannedAt,
					thumbnailPath: video.thumbnail_path,
					metadataExtractedAt: video.metadata_extracted_at,
					watchProgress: progress?.watchProgress ?? 0,
					watchTime: progress?.watchTime ?? 0,
					isLiked: progress?.isLiked ?? false,
					lastWatched: progress?.lastWatched ?? undefined,
				};
			} catch (progressError) {
				this.logger.error(
					`Progress error for ${video.filePath}:`,
					progressError,
				);
				return {
					id: video.id,
					title: video.title,
					fileName: video.fileName,
					filePath: video.filePath,
					fileSize: video.fileSize ? Number(video.fileSize) : 0,
					lastModified: video.lastModified,
					episode: video.episode,
					year: video.year ? video.year.toString() : null,
					duration: video.duration,
					scannedAt: video.scannedAt,
					thumbnailPath: video.thumbnail_path,
					metadataExtractedAt: video.metadata_extracted_at,
					watchProgress: 0,
					watchTime: 0,
					isLiked: false,
					lastWatched: undefined,
				};
			}
		} catch (error) {
			this.logger.error("Error getting video:", error);
			throw error;
		}
	}
}
