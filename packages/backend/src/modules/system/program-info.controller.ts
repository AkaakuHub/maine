import {
	Controller,
	Get,
	Query,
	Res,
	Logger,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import type { ProgramInfoService } from './program-info.service';

@ApiTags('program-info')
@Controller('programInfo')
export class ProgramInfoController {
	private readonly logger = new Logger(ProgramInfoController.name);

	constructor(private readonly programInfoService: ProgramInfoService) {}

	@Get()
	@ApiQuery({ name: 'filePath', required: true, description: '動画ファイルパス' })
	@ApiResponse({ status: 200, description: '番組情報取得成功' })
	@ApiResponse({ status: 400, description: 'バリデーションエラー' })
	@ApiResponse({ status: 500, description: 'サーバーエラー' })
	async getProgramInfo(@Query('filePath') filePath: string, @Res({ passthrough: true }) response: Response) {
		try {
			const result = await this.programInfoService.getProgramInfo(filePath);

			if (!result.success) {
				if (result.error?.includes('指定されていません')) {
					response.status(400);
					return { error: result.error };
				}
				return {
					success: false,
					programInfo: result.programInfo,
					message: result.message,
				};
			}

			return {
				success: true,
				programInfo: result.programInfo,
				filePath: result.filePath,
			};
		} catch (error) {
			this.logger.error('番組情報の取得エラー:', error);
			response.status(500);
			return {
				error: "番組情報の取得に失敗しました",
			};
		}
	}
}