import {
	Controller,
	Get,
	Post,
	Put,
	Body,
	Logger,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import type { ScanSettingsService } from "./scan-settings.service";
import type { ScanSettings } from "./scan-settings.service";

@ApiTags("scan")
@Controller("scan/settings")
export class ScanSettingsController {
	private readonly logger = new Logger(ScanSettingsController.name);

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
				error: "Failed to get scan settings",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	@Post()
	@ApiResponse({ status: 200, description: "スキャン設定更新" })
	async updateScanSettings(@Body() settings: Partial<ScanSettings>) {
		try {
			this.logger.log("Updating scan settings");

			const result = await this.scanSettingsService.updateScanSettings(settings);

			return {
				success: true,
				message: "Scan settings updated successfully",
				settings: result,
			};
		} catch (error) {
			this.logger.error("Failed to update scan settings:", error);
			return {
				success: false,
				error: "Failed to update scan settings",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	@Put()
	@ApiResponse({ status: 200, description: "スキャン設定リセット" })
	async resetScanSettings() {
		try {
			this.logger.log("Resetting scan settings to default");

			const defaultSettings = await this.scanSettingsService.resetScanSettings();

			return {
				success: true,
				message: "Scan settings reset to default",
				settings: defaultSettings,
			};
		} catch (error) {
			this.logger.error("Failed to reset scan settings:", error);
			return {
				success: false,
				error: "Failed to reset scan settings",
				details: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}