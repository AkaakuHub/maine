import { Injectable, type OnModuleInit } from "@nestjs/common";
import { prisma } from "../../libs/prisma";
import {
	DEFAULT_SCAN_SETTINGS,
	type ScanSettings,
} from "../../types/scanSettings";

export type { ScanSettings } from "../../types/scanSettings";

@Injectable()
export class ScanSettingsService implements OnModuleInit {
	private scanSettings: ScanSettings = { ...DEFAULT_SCAN_SETTINGS };

	async onModuleInit(): Promise<void> {
		await this.loadScanSettings();
	}

	getScanSettings(): ScanSettings {
		return this.scanSettings;
	}

	async updateScanSettings(
		newSettings: Partial<ScanSettings>,
	): Promise<ScanSettings> {
		this.scanSettings = { ...this.scanSettings, ...newSettings };
		await this.saveScanSettings();
		return this.scanSettings;
	}

	async resetScanSettings(): Promise<ScanSettings> {
		this.scanSettings = { ...DEFAULT_SCAN_SETTINGS };
		await this.saveScanSettings();
		return this.scanSettings;
	}

	private async loadScanSettings(): Promise<void> {
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
					enabled: false,
					startHour: savedSettings.autoPauseStartHour,
					endHour: savedSettings.autoPauseEndHour,
				},
				enableDetailedLogging: savedSettings.enableDetailedLogging,
				showResourceMonitoring: savedSettings.enableResourceMonitoring,
				enablePerformanceMetrics:
					DEFAULT_SCAN_SETTINGS.enablePerformanceMetrics,
			};
		}
	}

	private async saveScanSettings(): Promise<void> {
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
	}
}
