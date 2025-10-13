import { PAGINATION } from "../../utils";
import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/database/prisma.service";
import * as crypto from "node:crypto";

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
	videoId: string | null; // SHA-256ハッシュID (32文字)
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

	/**
	 * ファイルパスからSHA-256ハッシュを生成
	 * @param filePath 動画ファイルのフルパス
	 * @returns 32文字のSHA-256ハッシュ文字列
	 */
	generateVideoId(filePath: string): string {
		return crypto.createHash("sha256").update(filePath).digest("hex");
	}

	/**
	 * videoIdからVideoMetadataを取得
	 * @param videoId 32文字のSHA-256ハッシュID
	 * @returns VideoMetadata or null
	 */
	async getVideoByVideoId(videoId: string): Promise<VideoData | null> {
		try {
			this.logger.log(`Getting video with videoId: ${videoId}`);

			const video = await this.prisma.videoMetadata.findUnique({
				where: { videoId },
				select: {
					id: true,
					title: true,
					fileName: true,
					filePath: true,
					fileSize: true,
					episode: true,
					year: true,
					lastModified: true,
					duration: true,
					scannedAt: true,
					thumbnail_path: true,
					metadata_extracted_at: true,
					videoId: true,
				},
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
					videoId: video.videoId,
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
					videoId: video.videoId,
					watchProgress: 0,
					watchTime: 0,
					isLiked: false,
					lastWatched: undefined,
				};
			}
		} catch (error) {
			this.logger.error("Error getting video by videoId:", error);
			throw error;
		}
	}

	/**
	 * 既存動画にvideoIdを一括設定（マイグレーション用）
	 * @returns 処理した動画数
	 */
	async migrateExistingVideos(): Promise<number> {
		this.logger.log("Starting migration of existing videos to videoId...");

		try {
			// videoIdが未設定の動画を取得
			const videosWithoutId = await this.prisma.videoMetadata.findMany({
				where: { videoId: null },
				select: { id: true, filePath: true },
			});

			let processedCount = 0;

			for (const video of videosWithoutId) {
				try {
					const videoId = this.generateVideoId(video.filePath);

					await this.prisma.videoMetadata.update({
						where: { id: video.id },
						data: { videoId },
					});

					processedCount++;
					this.logger.log(
						`Migrated video ${processedCount}/${videosWithoutId.length}: ${video.filePath} -> ${videoId}`,
					);
				} catch (error) {
					this.logger.error(
						`Failed to migrate video: ${video.filePath}`,
						error,
					);
				}
			}

			this.logger.log(
				`Migration completed. Processed ${processedCount} videos.`,
			);
			return processedCount;
		} catch (error) {
			this.logger.error("Migration failed", error);
			throw new Error("Migration failed");
		}
	}

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
							videoId: v.videoId, // videoIdを追加
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
							videoId: v.videoId, // videoIdを追加
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
				select: {
					id: true,
					title: true,
					fileName: true,
					filePath: true,
					fileSize: true,
					episode: true,
					year: true,
					lastModified: true,
					duration: true,
					scannedAt: true,
					thumbnail_path: true,
					metadata_extracted_at: true,
					videoId: true, // videoIdを取得
				},
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
					videoId: video.videoId, // videoIdを追加
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
					videoId: video.videoId, // videoIdを追加
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
