import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
} from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { SearchVideosDto } from "./dto/search-videos.dto";
import type { VideoData } from "./videos.service";
import { VideosService } from "./videos.service";

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

	constructor(private readonly videosService: VideosService) {}

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
	): Promise<SearchVideosResponse> {
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
}
