import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Logger,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";

interface CreateChapterSkipRuleRequest {
	pattern: string;
	enabled?: boolean;
}

interface UpdateChapterSkipRuleRequest {
	pattern?: string;
	enabled?: boolean;
}

@ApiTags("settings")
@Controller("settings/chapter-skip")
export class ChapterSkipController {
	private readonly logger = new Logger(ChapterSkipController.name);

	constructor(private readonly settingsService: SettingsService) {}

	@Get()
	@ApiResponse({ status: 200, description: "チャプタースキップルール一覧取得" })
	async getChapterSkipRules() {
		try {
			const result = await this.settingsService.getChapterSkipRules();

			if (!result.success) {
				throw new BadRequestException(result.error);
			}

			return {
				success: true,
				data: result.rules,
			};
		} catch (error) {
			this.logger.error("Get chapter skip rules error:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException("Failed to fetch chapter skip rules");
		}
	}

	@Post()
	@ApiResponse({ status: 200, description: "チャプタースキップルール作成" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	async createChapterSkipRule(@Body() body: CreateChapterSkipRuleRequest) {
		try {
			// バリデーション
			if (!body.pattern || typeof body.pattern !== "string") {
				throw new BadRequestException({
					error: "パターンが必要で文字列である必要があります",
				});
			}

			if (body.pattern.length < 1) {
				throw new BadRequestException({
					error: "パターンは1文字以上である必要があります",
				});
			}

			if (body.pattern.length > 200) {
				throw new BadRequestException({
					error: "パターンは200文字未満である必要があります",
				});
			}

			const result = await this.settingsService.createChapterSkipRule({
				pattern: body.pattern,
				enabled: body.enabled ?? true,
			});

			if (!result.success) {
				throw new BadRequestException({ error: result.error });
			}

			return {
				success: true,
				data: result.rule,
			};
		} catch (error) {
			this.logger.error("Create chapter skip rule error:", error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException("Failed to create chapter skip rule");
		}
	}

	@Put(":id")
	@ApiResponse({ status: 200, description: "チャプタースキップルール更新" })
	@ApiResponse({ status: 400, description: "バリデーションエラー" })
	@ApiResponse({ status: 404, description: "ルールが見つからない" })
	async updateChapterSkipRule(
		@Param("id") id: string,
		@Body() body: UpdateChapterSkipRuleRequest,
	) {
		try {
			// バリデーション
			if (body.pattern !== undefined) {
				if (typeof body.pattern !== "string") {
					throw new BadRequestException({
						error: "パターンは文字列である必要があります",
					});
				}

				if (body.pattern.length < 1) {
					throw new BadRequestException({
						error: "パターンは1文字以上である必要があります",
					});
				}

				if (body.pattern.length > 200) {
					throw new BadRequestException({
						error: "パターンは200文字未満である必要があります",
					});
				}
			}

			if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
				throw new BadRequestException({
					error: "有効フラグはboolean型である必要があります",
				});
			}

			const result = await this.settingsService.updateChapterSkipRule(id, {
				pattern: body.pattern,
				enabled: body.enabled,
			});

			if (!result.success) {
				if (result.error?.includes("not found")) {
					throw new NotFoundException(result.error);
				}
				throw new BadRequestException({ error: result.error });
			}

			return {
				success: true,
				data: result.rule,
			};
		} catch (error) {
			this.logger.error(`Update chapter skip rule error (${id}):`, error);
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new BadRequestException("Failed to update chapter skip rule");
		}
	}

	@Delete()
	@ApiResponse({ status: 200, description: "チャプタースキップルール削除" })
	@ApiResponse({ status: 404, description: "ルールが見つからない" })
	async deleteChapterSkipRule(@Query("id") id: string) {
		try {
			const result = await this.settingsService.deleteChapterSkipRule(id);

			if (!result.success) {
				if (result.error?.includes("not found")) {
					throw new NotFoundException(result.error);
				}
				throw new BadRequestException({ error: result.error });
			}

			return {
				success: true,
			};
		} catch (error) {
			this.logger.error(`Delete chapter skip rule error (${id}):`, error);
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new BadRequestException("Failed to delete chapter skip rule");
		}
	}
}
