import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	UseGuards,
	ForbiddenException,
	Request,
} from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { SearchVideosDto } from "./dto/search-videos.dto";
import type { VideoData } from "./videos.service";
import { VideosService } from "./videos.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { PermissionsService } from "../../auth/permissions.service";

type SearchVideosResponse = {
	success: boolean;
	videos: VideoData[];
	totalFound: number;
	message: string;
	error?: string;
};

@ApiTags("videos")
@Controller("videos")
export class VideosController {
	private readonly logger = new Logger(VideosController.name);

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
	@UseGuards(JwtAuthGuard)
	async searchVideos(
		@Query() query: SearchVideosDto,
		@Request() req,
	): Promise<SearchVideosResponse> {
		// ユーザーIDを取得
		const userId = req.user?.sub;
		if (!userId) {
			throw new ForbiddenException("認証が必要です");
		}

		// 検索クエリに基づいてディレクトリを推測
		let directoryPath = "/";
		if (query.search) {
			// 検索語からディレクトリパスを推測
			const video = await this.videosService.getVideoBySearchTerm(query.search);
			if (video) {
				const pathParts = video.filePath.split("/");
				// ディレクトリパスまで取得
				if (pathParts.length > 1) {
					directoryPath = `/${pathParts.slice(0, -1).join("/")}`;
				}
			}
		}

		// 権限チェック
		const hasAccess = await this.permissionsService.checkDirectoryAccess(
			userId,
			directoryPath,
		);
		if (!hasAccess) {
			throw new ForbiddenException(
				`このディレクトリへのアクセス権がありません: ${directoryPath}`,
			);
		}
		try {
			this.logger.log(`Searching videos with query: "${query.search}"`);
			this.logger.log(`Query length: ${query.search?.length || 0}`);
			this.logger.log(`Exact match: ${query.exactMatch}`);

			// 常にsearchVideosを使用（空文字の場合は全件取得、クエリありの場合は検索）
			const searchResult = await this.videosService.searchVideos(
				query.search || "",
			);

			this.logger.log(`Search result success: ${searchResult.success}`);
			this.logger.log(
				`Search result videos count: ${searchResult.videos.length}`,
			);

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

			// 完全マッチが要求された場合は、ファイルパスで厳密にフィルタリング
			if (query.exactMatch && query.search) {
				this.logger.log(`Exact match query: "${query.search}"`);
				this.logger.log(`Query length: ${query.search.length}`);
				this.logger.log("Available video paths:");
				searchResult.videos.forEach((video, index) => {
					this.logger.log(
						`  [${index}] Path: "${video.filePath}" (length: ${video.filePath.length})`,
					);
					this.logger.log(
						`  [${index}] Match: ${video.filePath === query.search}`,
					);
				});

				const filteredVideos = searchResult.videos.filter(
					(video) => video.filePath === query.search,
				);
				this.logger.log(
					`Exact match filtered videos: ${filteredVideos.length}`,
				);

				// フィルタリング結果でsearchResultを更新
				return {
					...searchResult,
					videos: filteredVideos,
					totalFound: filteredVideos.length,
					message: `${filteredVideos.length}件の動画が見つかりました`,
				};
			}

			return searchResult;
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
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("ADMIN")
	@ApiResponse({
		status: 200,
		description: "VIDEO_DIRECTORYに基づくディレクトリ一覧",
	})
	async getDirectories(): Promise<string[]> {
		try {
			this.logger.log("Getting directories from VIDEO_DIRECTORY");

			// VIDEO_DIRECTORY環境変数からディレクトリを取得
			const videoDirectory = process.env.VIDEO_DIRECTORY;
			if (!videoDirectory) {
				this.logger.warn("VIDEO_DIRECTORY not found, using default");
				return ["/"];
			}

			// ビデオサービスからディレクトリ一覧を取得
			const directories =
				await this.videosService.getDirectoriesFromVideoDirectory(
					videoDirectory,
				);

			this.logger.log(
				`Found ${directories.length} directories from VIDEO_DIRECTORY: ${videoDirectory}`,
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
}
