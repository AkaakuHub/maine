import { PAGINATION } from "../../utils";
import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/database/prisma.service";
import * as fs from "node:fs";
import { SearchResult } from "../../type";

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
	playlistId?: string | null; // プレイリストID
	playlistName?: string | null; // プレイリスト名
}

interface ContinueWatchingVideo extends VideoData {
	watchTime: number;
	watchProgress: number;
	lastWatched: Date | null;
}

@Injectable()
export class VideosService {
	private readonly logger = new Logger(VideosService.name);

	constructor(private readonly prisma: PrismaService) {}

	async getVideoByIdForApi(id: string) {
		try {
			this.logger.log(`Getting video by id: ${id}`);

			const video = await this.prisma.videoMetadata.findUnique({
				where: { id },
				include: {
					playlists: {
						include: {
							playlist: {
								select: {
									id: true,
									name: true,
									path: true,
								},
							},
						},
						take: 1, // 最初のプレイリストのみ取得
					},
				},
			});

			if (!video) {
				return { success: false, error: "Video not found" };
			}

			// 最初のプレイリスト情報を取得
			const firstPlaylist =
				video.playlists.length > 0 ? video.playlists[0] : null;

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
				playlistId: firstPlaylist?.playlist.id,
				playlistName: firstPlaylist?.playlist.name,
			};

			return { success: true, video: videoData };
		} catch (error) {
			this.logger.error("Error getting video by id:", error);
			return { success: false, error: "Internal server error" };
		}
	}

	async searchVideos(
		query: string,
		options?: {
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

			// ページネーションを適用
			const takeLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

			// 動画データを取得
			const videos = await this.prisma.videoMetadata.findMany({
				where,
				orderBy,
				take: takeLimit,
				skip: skip,
			});

			this.logger.log(
				`Found ${videos.length} videos (total: ${totalCount}, page: ${page}, limit: ${limit})`,
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
			}));

			this.logger.log(`Returning ${videosWithProgress.length} videos`);

			// ページネーション情報を計算
			const pagination = {
				page,
				limit,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limit),
			};

			return {
				success: true,
				videos: videosWithProgress,
				totalFound: videosWithProgress.length,
				message: `${videosWithProgress.length}件の動画が見つかりました（全${totalCount}件中）`,
				pagination,
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

	async getContinueWatchingVideos(
		userId: string,
		options?: { page?: number; limit?: number },
	): Promise<SearchResult> {
		try {
			const page = Math.max(1, options?.page || 1);
			const limit = Math.min(
				options?.limit || PAGINATION.DEFAULT_LIMIT,
				PAGINATION.MAX_LIMIT,
			);
			const skip = (page - 1) * limit;

			const progressWhere: Prisma.VideoProgressWhereInput = {
				userId,
				OR: [{ watchProgress: { gt: 0 } }, { watchTime: { gt: 0 } }],
			};

			const totalCount = await this.prisma.videoProgress.count({
				where: progressWhere,
			});

			if (totalCount === 0) {
				return {
					success: true,
					videos: [],
					totalFound: 0,
					message: "視聴途中の動画はありません",
					pagination: {
						page,
						limit,
						total: 0,
						totalPages: 0,
					},
				};
			}

			const progressEntries = await this.prisma.videoProgress.findMany({
				where: progressWhere,
				orderBy: [{ lastWatched: "desc" }, { updatedAt: "desc" }],
				skip,
				take: limit,
			});

			const filePaths = progressEntries.map((entry) => entry.filePath);
			const videos = await this.prisma.videoMetadata.findMany({
				where: {
					filePath: {
						in: filePaths,
					},
				},
			});

			const videoMap = new Map(videos.map((video) => [video.filePath, video]));
			const continueVideos: ContinueWatchingVideo[] = [];
			for (const progress of progressEntries) {
				const video = videoMap.get(progress.filePath);
				if (!video) {
					continue;
				}

				continueVideos.push({
					id: video.id,
					title: video.title,
					fileName: video.fileName,
					filePath: video.filePath,
					fileSize: video.fileSize ? Number(video.fileSize) : 0,
					duration: video.duration,
					episode: video.episode,
					year: video.year ? video.year.toString() : null,
					lastModified: video.lastModified,
					scannedAt: video.scannedAt,
					thumbnailPath: video.thumbnail_path,
					metadataExtractedAt: video.metadata_extracted_at,
					watchTime: progress.watchTime ?? 0,
					watchProgress: progress.watchProgress ?? 0,
					lastWatched: progress.lastWatched,
				});
			}

			return {
				success: true,
				videos: continueVideos,
				totalFound: continueVideos.length,
				message:
					continueVideos.length > 0
						? `${continueVideos.length}件の視聴途中の動画が見つかりました`
						: "視聴途中の動画はありません",
				pagination: {
					page,
					limit,
					total: totalCount,
					totalPages: Math.ceil(totalCount / limit),
				},
			};
		} catch (error) {
			this.logger.error("Error fetching continue watching videos:", error);
			return {
				success: false,
				videos: [],
				totalFound: 0,
				message: "視聴途中の動画の取得に失敗しました",
				error: error instanceof Error ? error.message : "不明なエラー",
			};
		}
	}
}
