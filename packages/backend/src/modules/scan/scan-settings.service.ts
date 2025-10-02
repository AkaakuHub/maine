import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient as SettingsPrismaClient } from "../../../prisma/generated/settings";

export interface TimeRange {
	enabled: boolean;
	startHour: number; // 0-23
	endHour: number; // 0-23
}

export interface ScanSettings {
	// 基本設定
	batchSize: number; // バッチサイズ（1-200）
	progressUpdateInterval: number; // 進捗更新間隔（ファイル数）
	sleepInterval: number; // CPU休憩時間（ms）

	// パフォーマンス設定
	processingPriority: "low" | "normal" | "high"; // 処理優先度
	maxConcurrentOperations: number; // メタデータ処理の並列実行数
	memoryThresholdMB: number; // メモリ使用量しきい値

	// 一時停止設定
	autoPauseOnHighCPU: boolean; // 高CPU使用率時の自動一時停止
	autoPauseThreshold: number; // CPU使用率しきい値（%）
	autoPauseTimeRange: TimeRange; // 時間帯による自動一時停止

	// デバッグ・監視設定
	enableDetailedLogging: boolean; // 詳細ログ出力
	showResourceMonitoring: boolean; // リソース監視表示
	enablePerformanceMetrics: boolean; // パフォーマンス指標
}

export const DEFAULT_SCAN_SETTINGS: ScanSettings = {
	// 基本設定
	batchSize: 50,
	progressUpdateInterval: 10,
	sleepInterval: 100,

	// パフォーマンス設定（バランス型）
	processingPriority: "normal",
	maxConcurrentOperations: 3,
	memoryThresholdMB: 1024,

	// 一時停止設定（無効）
	autoPauseOnHighCPU: false,
	autoPauseThreshold: 80,
	autoPauseTimeRange: {
		enabled: false,
		startHour: 22,
		endHour: 6,
	},

	// デバッグ・監視設定（有効）
	enableDetailedLogging: true,
	showResourceMonitoring: true,
	enablePerformanceMetrics: true,
};

@Injectable()
export class ScanSettingsService {
	private readonly logger = new Logger(ScanSettingsService.name);
	private settingsDb: SettingsPrismaClient;
	private scanSettings: ScanSettings = DEFAULT_SCAN_SETTINGS;

	constructor() {
		this.settingsDb = new SettingsPrismaClient();
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
			const savedSettings = await this.settingsDb.scanSettings.findUnique({
				where: { id: "scan_settings" },
			});

			if (savedSettings) {
				this.scanSettings = {
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
			await this.settingsDb.scanSettings.upsert({
				where: { id: "scan_settings" },
				update: {
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
