import {
	Controller,
	Get,
	Param,
	HttpException,
	HttpStatus,
	UseGuards,
	ForbiddenException,
	Request,
	Logger,
} from "@nestjs/common";
import { ApiTags, ApiParam, ApiResponse } from "@nestjs/swagger";
import type { Request as ExpressRequest } from "express";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsService } from "../../auth/permissions.service";
import { PrismaService } from "../../common/database/prisma.service";

@ApiTags("playlists")
@Controller("playlists")
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
	private readonly logger = new Logger(PlaylistsController.name);

	constructor(
		private readonly permissionsService: PermissionsService,
		private readonly prisma: PrismaService,
	) {}

	@Get()
	@ApiResponse({ status: 200, description: "プレイリスト一覧取得成功" })
	@ApiResponse({ status: 401, description: "認証が必要" })
	@ApiResponse({ status: 403, description: "アクセス権限なし" })
	async getPlaylists(
		@Request() req: ExpressRequest & { user?: { userId: string } },
	) {
		const userId = req.user?.userId;
		if (!userId) {
			this.logger.error(
				`No user ID found in request. User object: ${JSON.stringify(req.user)}`,
			);
			throw new ForbiddenException("認証が必要です");
		}

		try {
			const playlists = await this.prisma.playlist.findMany({
				where: { isActive: true },
				orderBy: { name: "asc" },
				include: {
					videos: {
						include: {
							video: {
								select: {
									id: true,
									filePath: true,
									fileName: true,
									title: true,
									duration: true,
									thumbnail_path: true,
								},
							},
						},
						orderBy: {
							addedAt: "asc",
						},
					},
				},
			});

			// 各プレイリストに対してアクセス権をチェック
			const accessiblePlaylists: Array<{
				id: string;
				name: string;
				path: string;
				description: string | null;
				videoCount: number;
				totalDuration: number;
				createdAt: Date;
				updatedAt: Date;
				isActive: boolean;
				videos: Array<{
					id: string;
					filePath: string;
					fileName: string;
					title: string | null;
					duration: number | null;
					thumbnailPath: string | null;
				}>;
			}> = [];
			for (const playlist of playlists) {
				// プレイリスト内の動画のいずれかにアクセス権があるかチェック
				let hasAccess = false;
				for (const videoRelation of playlist.videos) {
					const pathParts = videoRelation.video.filePath.split("/");
					let videoDirectory = "/";
					if (pathParts.length > 1) {
						videoDirectory = pathParts.slice(0, -1).join("/") || "/";
					}

					const access = await this.permissionsService.checkDirectoryAccess(
						userId,
						videoDirectory,
					);
					if (access) {
						hasAccess = true;
						break;
					}
				}

				if (hasAccess) {
					accessiblePlaylists.push({
						id: playlist.id,
						name: playlist.name,
						path: playlist.path,
						description: playlist.description,
						videoCount: playlist.videos.length,
						totalDuration: playlist.videos.reduce(
							(sum, v) => sum + (v.video.duration || 0),
							0,
						),
						createdAt: playlist.createdAt,
						updatedAt: playlist.updatedAt,
						isActive: playlist.isActive,
						videos: playlist.videos.map((v) => ({
							id: v.video.id,
							filePath: v.video.filePath,
							fileName: v.video.fileName,
							title: v.video.title,
							duration: v.video.duration,
							thumbnailPath: v.video.thumbnail_path,
						})),
					});
				}
			}

			return {
				success: true,
				playlists: accessiblePlaylists,
			};
		} catch (error) {
			this.logger.error("Failed to get playlists:", error);
			throw new HttpException(
				"プレイリストの取得に失敗しました",
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	@Get(":id/videos")
	@ApiParam({ name: "id", description: "プレイリストID" })
	@ApiResponse({ status: 200, description: "プレイリスト動画一覧取得成功" })
	@ApiResponse({ status: 401, description: "認証が必要" })
	@ApiResponse({ status: 403, description: "アクセス権限なし" })
	@ApiResponse({ status: 404, description: "プレイリストが見つからない" })
	async getPlaylistVideos(
		@Param("id") playlistId: string,
		@Request() req: ExpressRequest & { user?: { userId: string } },
	) {
		const userId = req.user?.userId;
		if (!userId) {
			this.logger.error(
				`No user ID found in request. User object: ${JSON.stringify(req.user)}`,
			);
			throw new ForbiddenException("認証が必要です");
		}

		try {
			// プレイリストの存在確認
			const playlist = await this.prisma.playlist.findUnique({
				where: { id: playlistId },
				include: {
					videos: {
						include: {
							video: true,
						},
						orderBy: {
							addedAt: "asc",
						},
					},
				},
			});

			if (!playlist) {
				throw new HttpException(
					"プレイリストが見つかりません",
					HttpStatus.NOT_FOUND,
				);
			}

			// アクセス権チェック
			const accessibleVideos: Array<{
				id: string;
				filePath: string;
				fileName: string;
				title: string | null;
				duration: number | null;
				episode: number | null;
				year: number | null;
				thumbnailPath: string | null;
				videoId: string | null;
				addedAt: Date;
			}> = [];
			for (const videoRelation of playlist.videos) {
				const pathParts = videoRelation.video.filePath.split("/");
				let videoDirectory = "/";
				if (pathParts.length > 1) {
					videoDirectory = pathParts.slice(0, -1).join("/") || "/";
				}

				const hasAccess = await this.permissionsService.checkDirectoryAccess(
					userId,
					videoDirectory,
				);

				if (hasAccess) {
					accessibleVideos.push({
						id: videoRelation.video.id,
						filePath: videoRelation.video.filePath,
						fileName: videoRelation.video.fileName,
						title: videoRelation.video.title,
						duration: videoRelation.video.duration,
						episode: videoRelation.video.episode,
						year: videoRelation.video.year,
						thumbnailPath: videoRelation.video.thumbnail_path,
						videoId: videoRelation.video.videoId,
						addedAt: videoRelation.addedAt,
					});
				}
			}

			return {
				success: true,
				playlist: {
					id: playlist.id,
					name: playlist.name,
					path: playlist.path,
					description: playlist.description,
					videoCount: accessibleVideos.length,
					totalDuration: accessibleVideos.reduce(
						(sum, v) => sum + (v.duration || 0),
						0,
					),
					createdAt: playlist.createdAt,
					updatedAt: playlist.updatedAt,
				},
				videos: accessibleVideos,
			};
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}

			this.logger.error(
				`Failed to get playlist videos for ${playlistId}:`,
				error,
			);
			throw new HttpException(
				"プレイリスト動画の取得に失敗しました",
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
