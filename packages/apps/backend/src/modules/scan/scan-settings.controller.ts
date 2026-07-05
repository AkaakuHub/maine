import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { createAppLogger } from "../../common/logger";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { ScanSettingsService } from "./scan-settings.service";
import type { ScanSettings } from "./scan-settings.service";

@ApiTags("scan")
@Controller("scan/settings")
export class ScanSettingsController {
	private readonly logger = createAppLogger(ScanSettingsController.name);

	constructor(private readonly scanSettingsService: ScanSettingsService) {}

	@Get()
	@ApiResponse({ status: 200, description: "スキャン設定取得" })
	async getScanSettings() {
		try {
			const settings = this.scanSettingsService.getScanSettings();
			return {
				success: true,
				settings,
			};
		} catch (error) {
			this.logger.error("Failed to get scan settings:", error);
			return {
				success: false,
				error: "スキャン設定の取得に失敗しました",
				details: error instanceof Error ? error.message : "不明なエラー",
			};
		}
	}

	@Post()
	@ApiResponse({ status: 200, description: "スキャン設定更新" })
	async updateScanSettings(@Body() settings: Partial<ScanSettings>) {
		try {
			const result =
				await this.scanSettingsService.updateScanSettings(settings);

			return {
				success: true,
				message: "スキャン設定が正常に更新されました",
				settings: result,
			};
		} catch (error) {
			this.logger.error("Failed to update scan settings:", error);
			return {
				success: false,
				error: "スキャン設定の更新に失敗しました",
				details: error instanceof Error ? error.message : "不明なエラー",
			};
		}
	}

	@Put()
	@ApiResponse({ status: 200, description: "スキャン設定リセット" })
	async resetScanSettings() {
		try {
			const defaultSettings =
				await this.scanSettingsService.resetScanSettings();

			return {
				success: true,
				message: "スキャン設定がデフォルトにリセットされました",
				settings: defaultSettings,
			};
		} catch (error) {
			this.logger.error("Failed to reset scan settings:", error);
			return {
				success: false,
				error: "スキャン設定のリセットに失敗しました",
				details: error instanceof Error ? error.message : "不明なエラー",
			};
		}
	}
}
