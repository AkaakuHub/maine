import { Injectable, Logger } from "@nestjs/common";
import { sseStore } from "../../common/sse/sse-connection.store";
import { videoCacheService } from "../../services/videoCacheService";
import {
	ScanSettingsService,
	type ScanSettings,
} from "./scan-settings.service";

interface ScanStatus {
	isScanning: boolean;
	progress: number;
	message: string;
}

interface ScanControlResult {
	message: string;
	success?: boolean;
	timestamp?: string;
}

@Injectable()
export class ScanService {
	private readonly logger = new Logger(ScanService.name);

	constructor(private readonly scanSettingsService: ScanSettingsService) {}

	async getScanStatus(): Promise<ScanStatus> {
		const status = videoCacheService.getUpdateStatus();
		return {
			isScanning: status.isUpdating,
			progress: status.progress,
			message: status.message,
		};
	}

	async startManualScan(): Promise<{ activeConnections: number }> {
		const status = videoCacheService.getUpdateStatus();
		if (status.isUpdating) {
			throw new Error("Scan already in progress");
		}

		this.logger.log("Starting manual scan");

		videoCacheService.manualRefresh().catch((error) => {
			this.logger.error("Background scan failed:", error);
		});

		return { activeConnections: sseStore.getConnectionCount() };
	}

	async controlScan(
		action: "pause" | "resume" | "cancel",
	): Promise<ScanControlResult> {
		this.logger.log(`Scan control: ${action}`);

		const scanId = videoCacheService.getCurrentScanStatus().scanId;
		if (!scanId) {
			throw new Error("No active scan found");
		}

		const result =
			action === "pause"
				? await videoCacheService.pauseScan(scanId)
				: action === "resume"
					? await videoCacheService.resumeScan(scanId)
					: await videoCacheService.cancelScan(scanId);

		return {
			success: result.success,
			message: result.message,
			timestamp: new Date().toISOString(),
		};
	}

	async getScanSettings(): Promise<ScanSettings> {
		return this.scanSettingsService.getScanSettings();
	}

	async updateScanSettings(
		settings: Partial<ScanSettings>,
	): Promise<ScanSettings> {
		this.logger.log("Updating scan settings:", settings);
		return await this.scanSettingsService.updateScanSettings(settings);
	}
}
