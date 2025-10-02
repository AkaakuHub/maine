import {
	Controller,
	Get,
	Post,
	Put,
	Query,
	Body,
	BadRequestException,
	Logger,
} from "@nestjs/common";
import { ApiTags, ApiResponse, ApiQuery } from "@nestjs/swagger";
import type { ProgressService } from "./progress.service";
import type { UpdateProgressDto } from "./dto/update-progress.dto";

@ApiTags("progress")
@Controller("progress")
export class ProgressController {
	private readonly logger = new Logger(ProgressController.name);

	constructor(private readonly progressService: ProgressService) {}

	@Get()
	@ApiQuery({
		name: "filePath",
		required: true,
		description: "動画ファイルパス",
	})
	@ApiResponse({ status: 200, description: "動画進捗取得" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async getVideoProgress(@Query("filePath") filePath: string) {
		try {
			const result = await this.progressService.getVideoProgress(filePath);

			if (!result.success) {
				if (result.error?.includes('required')) {
					throw new BadRequestException({ error: result.error });
				}
				throw new BadRequestException({
					error: result.error || 'Failed to fetch video progress',
				});
			}

			return {
				success: true,
				data: result.data,
			};
		} catch (error) {
			this.logger.error('Error fetching video progress:', error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				error: 'Failed to fetch video progress',
			});
		}
	}

	@Post()
	@ApiResponse({ status: 200, description: "動画進捗更新" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async updateVideoProgress(@Body() updateData: UpdateProgressDto) {
		try {
			const result = await this.progressService.updateVideoProgress(updateData);

			if (!result.success) {
				if (result.error?.includes('required')) {
					throw new BadRequestException({ error: result.error });
				}
				throw new BadRequestException({
					error: result.error || 'Failed to update video',
				});
			}

			return {
				success: true,
				data: result.data,
			};
		} catch (error) {
			this.logger.error('Error updating video:', error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException({
				error: 'Failed to update video',
			});
		}
	}

	@Put()
	@ApiResponse({ status: 200, description: "動画進捗更新" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async updateVideoProgressPut(@Body() updateData: UpdateProgressDto) {
		// POSTと同じ処理
		return this.updateVideoProgress(updateData);
	}
}
