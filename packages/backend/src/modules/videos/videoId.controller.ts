import {
	Controller,
	Get,
	Param,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { VideosService } from "./videos.service";
import { ApiTags, ApiParam, ApiResponse } from "@nestjs/swagger";

@ApiTags("videos")
@Controller("videos")
export class VideoIdController {
	constructor(private readonly videosService: VideosService) {}

	@Get("by-video-id/:videoId")
	@ApiParam({ name: "videoId", description: "64文字のSHA-256ハッシュID" })
	@ApiResponse({ status: 200, description: "動画情報の取得成功" })
	@ApiResponse({ status: 404, description: "動画が見つからない" })
	@ApiResponse({ status: 400, description: "無効なvideoId" })
	async getVideoByVideoId(@Param("videoId") videoId: string) {
		// videoIdの形式を検証
		if (!/^[a-f0-9]{64}$/i.test(videoId)) {
			throw new HttpException(
				"Invalid videoId format. Expected 64-character SHA-256 hash.",
				HttpStatus.BAD_REQUEST,
			);
		}

		const result = await this.videosService.getVideoByVideoIdForApi(videoId);

		if (!result.success) {
			throw new HttpException(
				result.error || "Video not found",
				HttpStatus.NOT_FOUND,
			);
		}

		return result;
	}
}
