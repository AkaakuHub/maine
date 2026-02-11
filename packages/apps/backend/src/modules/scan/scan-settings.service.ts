import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "../../libs/prisma";
import {
	DEFAULT_SCAN_SETTINGS,
	type ScanSettings,
} from "../../types/scanSettings";

export type { ScanSettings } from "../../types/scanSettings";

@Injectable()
export class ScanSettingsService {
	private readonly logger = new Logger(ScanSettingsService.name);
	private scanSettings: ScanSettings = { ...DEFAULT_SCAN_SETTINGS };

	constructor() {
		this.loadScanSettings();
	}

	/**
	 * スキャン設定を取得
	 */
	getScanSettings(): ScanSettings {
		return this.scanSettings;
	}

	/**
	 * スキャン設定を更新
	 */
	async updateScanSettings(
		newSettings: Partial<ScanSettings>,
	): Promise<ScanSettings> {
		this.scanSettings = { ...this.scanSettings, ...newSettings };
		await this.saveScanSettings();
		this.logger.log("Scan settings updated");
		return this.scanSettings;
	}

	/**
	 * スキャン設定をデフォルトにリセット
	 */
	async resetScanSettings(): Promise<ScanSettings> {
		this.scanSettings = { ...DEFAULT_SCAN_SETTINGS };
		await this.saveScanSettings();
		this.logger.log("Scan settings reset to default");
		return this.scanSettings;
	}

	/**
	 * 設定をDBから読み込み
	 */
	private async loadScanSettings(): Promise<void> {
		try {
			const savedSettings = await prisma.scanSettings.findUnique({
				where: { id: "scan_settings" },
			});

			if (savedSettings) {
				this.scanSettings = {
					scanMode: savedSettings.scanMode as "lightweight" | "full",
					batchSize: savedSettings.batchSize,
					progressUpdateInterval: savedSettings.progressUpdateInterval,
					sleepInterval: savedSettings.sleepInterval,
					processingPriority: savedSettings.processingPriority as
						| "low"
						| "normal"
						| "high",
					maxConcurrentOperations: savedSettings.maxConcurrentOperations,
					memoryThresholdMB: savedSettings.memoryThresholdMB,
					autoPauseOnHighCPU: savedSettings.autoPauseOnHighCPU,
					autoPauseThreshold: savedSettings.autoPauseThreshold,
					autoPauseTimeRange: {
						enabled: false, // DB has separate fields, not an enabled flag
						startHour: savedSettings.autoPauseStartHour,
						endHour: savedSettings.autoPauseEndHour,
					},
					enableDetailedLogging: savedSettings.enableDetailedLogging,
					showResourceMonitoring: savedSettings.enableResourceMonitoring,
					enablePerformanceMetrics: true, // DBには保存されていないためデフォルト値
				};
				this.logger.log("Scan settings loaded from database");
			} else {
				this.logger.log("No saved settings found, using defaults");
			}
		} catch (error) {
			this.logger.warn("Failed to load scan settings from database:", error);
		}
	}

	/**
	 * 設定をDBに保存
	 */
	private async saveScanSettings(): Promise<void> {
		try {
			await prisma.scanSettings.upsert({
				where: { id: "scan_settings" },
				update: {
					scanMode: this.scanSettings.scanMode,
					batchSize: this.scanSettings.batchSize,
					progressUpdateInterval: this.scanSettings.progressUpdateInterval,
					sleepInterval: this.scanSettings.sleepInterval,
					processingPriority: this.scanSettings.processingPriority,
					maxConcurrentOperations: this.scanSettings.maxConcurrentOperations,
					memoryThresholdMB: this.scanSettings.memoryThresholdMB,
					autoPauseOnHighCPU: this.scanSettings.autoPauseOnHighCPU,
					autoPauseThreshold: this.scanSettings.autoPauseThreshold,
					autoPauseStartHour: this.scanSettings.autoPauseTimeRange.startHour,
					autoPauseEndHour: this.scanSettings.autoPauseTimeRange.endHour,
					enableDetailedLogging: this.scanSettings.enableDetailedLogging,
					enableResourceMonitoring: this.scanSettings.showResourceMonitoring,
				},
				create: {
					id: "scan_settings",
					scanMode: this.scanSettings.scanMode,
					batchSize: this.scanSettings.batchSize,
					progressUpdateInterval: this.scanSettings.progressUpdateInterval,
					sleepInterval: this.scanSettings.sleepInterval,
					processingPriority: this.scanSettings.processingPriority,
					maxConcurrentOperations: this.scanSettings.maxConcurrentOperations,
					memoryThresholdMB: this.scanSettings.memoryThresholdMB,
					autoPauseOnHighCPU: this.scanSettings.autoPauseOnHighCPU,
					autoPauseThreshold: this.scanSettings.autoPauseThreshold,
					autoPauseStartHour: this.scanSettings.autoPauseTimeRange.startHour,
					autoPauseEndHour: this.scanSettings.autoPauseTimeRange.endHour,
					enableDetailedLogging: this.scanSettings.enableDetailedLogging,
					enableResourceMonitoring: this.scanSettings.showResourceMonitoring,
				},
			});
			this.logger.log("Scan settings saved to database");
		} catch (error) {
			this.logger.warn("Failed to save scan settings:", error);
		}
	}
}
