import { PAGINATION } from "../../utils";
import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/database/prisma.service";
import * as crypto from "node:crypto";
import * as fs from "node:fs";

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
	videoId: string | null; // SHA-256ハッシュID (64文字)
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
	 * @returns 64文字のSHA-256ハッシュ文字列
	 */
	generateVideoId(filePath: string): string {
		return crypto.createHash("sha256").update(filePath).digest("hex");
	}

	/**
	 * videoIdからVideoMetadataを取得
	 * @param videoId 64文字のSHA-256ハッシュID
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
			};
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

	// videoIdから動画情報を取得するAPIエンドポイント
	async getVideoByVideoIdForApi(videoId: string) {
		try {
			this.logger.log(`Getting video by videoId: ${videoId}`);

			const video = await this.prisma.videoMetadata.findUnique({
				where: { videoId },
			});

			if (!video) {
				return { success: false, error: "Video not found" };
			}

			const videoData: VideoData = {
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
			};

			return { success: true, video: videoData };
		} catch (error) {
			this.logger.error("Error getting video by videoId:", error);
			return { success: false, error: "Internal server error" };
		}
	}

	async searchVideos(
		query: string,
		options?: {
			loadAll?: boolean;
			sortBy?: string;
			sortOrder?: "asc" | "desc";
			page?: number;
			limit?: number;
		},
	): Promise<SearchResult> {
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

			// ソート順の構築
			const sortBy = options?.sortBy || "title";
			const sortOrder = options?.sortOrder || "asc";

			const orderBy: Array<Record<string, "asc" | "desc">> = [];

			switch (sortBy) {
				case "title":
					orderBy.push({ title: sortOrder });
					break;
				case "fileName":
					orderBy.push({ fileName: sortOrder });
					break;
				case "createdAt":
					orderBy.push({ scannedAt: sortOrder });
					break;
				case "updatedAt":
					orderBy.push({ lastModified: sortOrder });
					break;
				case "duration":
					orderBy.push({ duration: sortOrder });
					break;
				default:
					orderBy.push({ title: "asc" });
			}
			orderBy.push({ scannedAt: "desc" }); // 二番目のソート条件

			// ページネーション
			const page = options?.page || 1;
			const limit = options?.limit || 20;
			const skip = (page - 1) * limit;

			// 総件数を取得
			const totalCount = await this.prisma.videoMetadata.count({ where });

			// loadAllがtrueの場合は制限なし、それ以外はページネーションを適用
			const takeLimit = options?.loadAll
				? undefined
				: Math.min(limit, PAGINATION.MAX_LIMIT);

			// 動画データを取得
			const videos = await this.prisma.videoMetadata.findMany({
				where,
				orderBy,
				take: takeLimit,
				skip: options?.loadAll ? undefined : skip,
			});

			this.logger.log(
				`Found ${videos.length} videos (total: ${totalCount}, page: ${page}, limit: ${limit}, loadAll: ${options?.loadAll})`,
			);

			// 動画の基本情報を返す（進捗情報は含めない）
			const videosWithProgress = videos.map((v) => ({
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
				videoId: v.videoId,
			}));

			this.logger.log(`Returning ${videosWithProgress.length} videos`);

			const totalToReturn = options?.loadAll
				? totalCount
				: videosWithProgress.length;

			return {
				success: true,
				videos: videosWithProgress,
				totalFound: totalToReturn,
				message: `${videosWithProgress.length}件の動画が見つかりました（全${totalCount}件中）`,
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
			};
		} catch (error) {
			this.logger.error("Error getting video:", error);
			throw error;
		}
	}

	// VIDEO_DIRECTORYからディレクトリ一覧を取得（読み込み権限のみ）
	async getDirectoriesFromVideoDirectory(
		videoDirectory: string,
	): Promise<string[]> {
		try {
			this.logger.log(
				`Getting directories from VIDEO_DIRECTORY: ${videoDirectory}`,
			);

			const fsPromises = fs.promises;

			// ディレクトリが存在するか確認（読み取りアクセスのみ）
			try {
				await fsPromises.access(videoDirectory, fs.constants.R_OK);
			} catch {
				this.logger.warn(
					`VIDEO_DIRECTORY does not exist or no read access: ${videoDirectory}`,
				);
				return ["/"];
			}

			// VIDEO_DIRECTORY自身のみを返す
			const directories = [videoDirectory];
			this.logger.log(`Returning VIDEO_DIRECTORY itself: ${videoDirectory}`);
			return directories;
		} catch (error) {
			this.logger.error(
				"Error getting directories from VIDEO_DIRECTORY:",
				error,
			);
			return ["/"];
		}
	}

	// 検索語で動画を検索（権限チェック用）
	async getVideoBySearchTerm(
		searchTerm: string,
	): Promise<{ filePath: string } | null> {
		try {
			// 空文字の場合はルートを返す
			if (!searchTerm.trim()) {
				return null;
			}

			const videos = await this.prisma.videoMetadata.findMany({
				where: {
					title: {
						contains: searchTerm,
					},
				},
				select: {
					filePath: true,
				},
				take: 1,
			});

			return videos.length > 0 ? videos[0] : null;
		} catch (error) {
			this.logger.error("Error searching video:", error);
			return null;
		}
	}

	// データベースからディレクトリ一覧を取得
	async getDirectories(): Promise<string[]> {
		try {
			this.logger.log("Getting unique directories from database");

			// データベースからユニークなディレクトリパスを取得
			const videos = await this.prisma.videoMetadata.findMany({
				select: { filePath: true },
				where: {
					filePath: {
						not: "",
					},
				},
			});

			// ファイルパスからディレクトリパスを抽出
			const directories = new Set<string>();
			directories.add("/"); // ルートディレクトリを追加

			for (const video of videos) {
				if (video.filePath) {
					// ファイルパスからディレクトリパスを抽出
					const dirPath = video.filePath.substring(
						0,
						video.filePath.lastIndexOf("/"),
					);
					if (dirPath && dirPath !== "") {
						directories.add(dirPath);

						// 親ディレクトリも追加
						let currentPath = dirPath;
						while (currentPath !== "/" && currentPath.includes("/")) {
							currentPath = currentPath.substring(
								0,
								currentPath.lastIndexOf("/"),
							);
							if (currentPath === "" || currentPath === dirPath) break;
							directories.add(currentPath);
						}
					}
				}
			}

			const result = Array.from(directories).sort();
			this.logger.log(`Found ${result.length} unique directories`);
			return result;
		} catch (error) {
			this.logger.error("Error getting directories:", error);
			throw error;
		}
	}
}
