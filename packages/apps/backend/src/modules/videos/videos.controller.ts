import {
	BadRequestException,
	Controller,
	Get,
	Query,
	UseGuards,
} from "@nestjs/common";
import { createAppLogger } from "../../common/logger";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { SearchVideosDto } from "./dto/search-videos.dto";
import { ContinueWatchingQueryDto } from "./dto/continue-watching.dto";
import type { VideoData } from "./videos.service";
import { VideosService } from "./videos.service";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUserId } from "../../auth/decorators/current-user-id.decorator";
import { PermissionsService } from "../../auth/permissions.service";
import { getVideoDirectories } from "../../libs/fileUtils";

type SearchVideosResponse = {
	success: boolean;
	videos: VideoData[];
	totalFound: number;
	message: string;
	error?: string;
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

@ApiTags("videos")
@Controller("videos")
export class VideosController {
	private readonly logger = createAppLogger(VideosController.name);

	constructor(
		private readonly videosService: VideosService,
		private readonly permissionsService: PermissionsService,
	) {}

	@Get()
	@ApiQuery({ name: "search", required: false, description: "検索クエリ" })
	@ApiQuery({
		name: "exactMatch",
		required: false,
		description: "完全一致フラグ",
	})
	@ApiResponse({ status: 200, description: "動画検索結果" })
	async searchVideos(
		@Query() query: SearchVideosDto,
		@CurrentUserId() userId: string,
	): Promise<SearchVideosResponse> {
		try {
			const searchResult = await this.videosService.searchVideos(
				query.search || "",
				{
					sortBy: query.sortBy,
					sortOrder: query.sortOrder as "asc" | "desc",
					page: query.page,
					limit: query.limit,
				},
			);

			if (searchResult.videos.length === 0) {
				this.logger.debug(
					`No videos found for search query: "${query.search}", returning empty result`,
				);
				const page = query.page || 1;
				const limit = query.limit || 20;
				return {
					success: true,
					videos: [],
					totalFound: 0,
					message: "動画が見つかりませんでした",
					pagination: {
						page,
						limit,
						total: 0,
						totalPages: 0,
					},
				};
			}

			if (!searchResult.success) {
				this.logger.error(
					`Search failed: ${searchResult.message}`,
					searchResult.error,
				);
				throw new BadRequestException({
					error: searchResult.message,
					details: searchResult.error,
				});
			}

			// 各動画に対して権限チェックを行う
			const accessibleVideos: VideoData[] = [];
			for (const video of searchResult.videos) {
				const hasAccess = await this.permissionsService.checkFileAccess(
					userId,
					video.filePath,
				);

				if (hasAccess) {
					accessibleVideos.push(video);
				}
			}

			// 完全マッチが要求された場合は、アクセス可能な動画の中からさらにフィルタリング
			if (query.exactMatch && query.search) {
				const filteredVideos = accessibleVideos.filter(
					(video) => video.filePath === query.search,
				);

				const page = query.page || 1;
				const limit = query.limit || 20;
				const total = filteredVideos.length;
				const totalPages = Math.ceil(total / limit);

				return {
					...searchResult,
					videos: filteredVideos,
					totalFound: filteredVideos.length,
					message: `${filteredVideos.length}件の動画が見つかりました`,
					pagination: {
						page,
						limit,
						total,
						totalPages,
					},
				};
			}

			// 権限チェック済みの動画を返す
			return {
				...searchResult,
				videos: accessibleVideos,
				totalFound: accessibleVideos.length,
				message: `${accessibleVideos.length}件の動画が見つかりました`,
			};
		} catch (error) {
			this.logger.error("Video search error:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	@Get("directories")
	@UseGuards(RolesGuard)
	@Roles("ADMIN")
	@ApiResponse({
		status: 200,
		description: "VIDEO_DIRECTORYに基づくディレクトリ一覧",
	})
	async getDirectories(): Promise<string[]> {
		try {
			this.logger.debug("Getting directories from VIDEO_DIRECTORY");

			// getVideoDirectories関数からディレクトリを取得
			const directoriesList = getVideoDirectories();
			if (directoriesList.length === 0) {
				return [];
			}
			this.logger.debug(
				`Processing ${directoriesList.length} directories: ${directoriesList.join(", ")}`,
			);

			// 各ディレクトリからディレクトリ一覧を取得してマージ
			const allDirectories = new Set<string>("/");

			for (const dir of directoriesList) {
				try {
					const directories =
						await this.videosService.getDirectoriesFromVideoDirectory(dir);
					for (const d of directories) {
						allDirectories.add(d);
					}
				} catch (error) {
					this.logger.warn(`Failed to get directories from ${dir}:`, error);
				}
			}

			const directories = Array.from(allDirectories).sort();

			this.logger.debug(
				`Found ${directories.length} directories from VIDEO_DIRECTORY: ${directoriesList.join(", ")}`,
			);
			return directories;
		} catch (error) {
			this.logger.error("Get directories error:", error);
			throw new BadRequestException({
				error: "Failed to get directories",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	@Get("continue")
	@ApiResponse({ status: 200, description: "視聴途中の動画一覧" })
	async getContinueWatching(
		@Query() query: ContinueWatchingQueryDto,
		@CurrentUserId() userId: string,
	): Promise<SearchVideosResponse> {
		const page = query.page || 1;
		const limit = query.limit || 20;

		return this.videosService.getContinueWatchingVideos(userId, {
			page,
			limit,
		});
	}
}
