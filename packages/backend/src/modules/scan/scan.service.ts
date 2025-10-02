import { SCAN } from "@my-video-storage/shared-utils";
import { Injectable, Logger } from "@nestjs/common";
import type { ScanSettings } from "./scan-settings.service";

export interface ScanStatus {
	isScanning: boolean;
	progress: number;
	message: string;
}

export interface ScanControlResult {
	message: string;
	success?: boolean;
	timestamp?: string;
}

@Injectable()
export class ScanService {
	private readonly logger = new Logger(ScanService.name);
	private currentScan: {
		isScanning: boolean;
		progress: number;
		message: string;
		scanId: string;
		startTime?: Date;
	} = {
		isScanning: false,
		progress: 0,
		message: "",
		scanId: "",
	};

	async getScanStatus(): Promise<ScanStatus> {
		return {
			isScanning: this.currentScan.isScanning,
			progress: this.currentScan.progress,
			message: this.currentScan.message,
		};
	}

	async startManualScan(): Promise<{ activeConnections: number }> {
		if (this.currentScan.isScanning) {
			throw new Error("Scan already in progress");
		}

		this.logger.log("Starting manual scan");

		// スキャン状態を初期化
		this.currentScan = {
			isScanning: true,
			progress: 0,
			message: "スキャンを開始しています...",
			scanId: `${SCAN.SCAN_ID_PREFIX}${Date.now()}`,
			startTime: new Date(),
		};

		// 非同期でスキャンを実行
		this.executeScan().catch((error) => {
			this.logger.error("Background scan failed:", error);
			this.currentScan.isScanning = false;
			this.currentScan.message = `スキャン失敗: ${error instanceof Error ? error.message : String(error)}`;
		});

		return { activeConnections: 0 }; // SSE実装後に更新
	}

	async controlScan(
		action: "pause" | "resume" | "cancel",
	): Promise<ScanControlResult> {
		this.logger.log(`Scan control: ${action}`);

		switch (action) {
			case "cancel":
				if (this.currentScan.isScanning) {
					this.currentScan.isScanning = false;
					this.currentScan.message = "スキャンがキャンセルされました";
					return { message: "Scan cancelled successfully" };
				}
				break;
			case "pause":
				if (this.currentScan.isScanning) {
					this.currentScan.message = "スキャンが一時停止されました";
					return { message: "Scan paused successfully" };
				}
				break;
			case "resume":
				if (!this.currentScan.isScanning && this.currentScan.progress > 0) {
					this.currentScan.isScanning = true;
					this.currentScan.message = "スキャンが再開されました";
					// 実際の再開ロジックは後で実装
					return { message: "Scan resumed successfully" };
				}
				break;
		}

		throw new Error(`Cannot ${action} scan in current state`);
	}

	async getScanSettings(): Promise<ScanSettings> {
		// スキャン設定を返す（仮実装）
		return {
			batchSize: SCAN.DEFAULT_BATCH_SIZE,
			progressUpdateInterval: SCAN.DEFAULT_PROGRESS_UPDATE_INTERVAL,
			sleepInterval: SCAN.DEFAULT_SLEEP_INTERVAL,
			processingPriority: "normal",
			maxConcurrentOperations: SCAN.MIN_CONCURRENT_OPERATIONS,
			memoryThresholdMB: SCAN.DEFAULT_MEMORY_THRESHOLD_MB,
			autoPauseOnHighCPU: false,
			autoPauseThreshold: SCAN.DEFAULT_AUTO_PAUSE_THRESHOLD,
			autoPauseTimeRange: {
				enabled: false,
				startHour: SCAN.DEFAULT_AUTO_PAUSE_START_HOUR,
				endHour: SCAN.DEFAULT_AUTO_PAUSE_END_HOUR,
			},
			enableDetailedLogging: true,
			showResourceMonitoring: true,
			enablePerformanceMetrics: true,
		};
	}

	async updateScanSettings(
		settings: Partial<ScanSettings>,
	): Promise<ScanSettings> {
		this.logger.log("Updating scan settings:", settings);

		// 設定を保存するロジック（仮実装）
		// 実際にはデータベースや設定ファイルに保存

		// 既存のデフォルト設定を取得して、更新部分をマージ
		const currentSettings = await this.getScanSettings();
		const updatedSettings: ScanSettings = {
			...currentSettings,
			...settings,
		};

		return updatedSettings;
	}

	private async executeScan(): Promise<void> {
		this.logger.log("Executing scan...");

		try {
			// ここに実際のスキャンロジックを実装
			// 現在はシミュレーション

			const totalSteps = 10;
			for (let i = 0; i <= totalSteps; i++) {
				if (!this.currentScan.isScanning) {
					this.logger.log("Scan cancelled");
					return;
				}

				this.currentScan.progress = (i / totalSteps) * 100;
				this.currentScan.message = `スキャン中... ${i}/${totalSteps}`;

				// 進捗をシミュレート
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			this.currentScan.progress = 100;
			this.currentScan.message = "スキャン完了";
			this.currentScan.isScanning = false;

			this.logger.log("Scan completed successfully");
		} catch (error) {
			this.logger.error("Scan failed:", error);
			this.currentScan.isScanning = false;
			this.currentScan.message = `スキャン失敗: ${error instanceof Error ? error.message : String(error)}`;
			throw error;
		}
	}
}
