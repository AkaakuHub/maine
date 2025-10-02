import type { ScanSettings } from "../../types/scanSettings";
import { SCAN } from "../../utils/constants";

export interface MemoryUsage {
	used: number;
	total: number;
	usagePercent: number;
}

export interface CPUUsage {
	user: number;
	system: number;
	percent: number;
}

/**
 * スキャン処理のリソース監視クラス
 * メモリ・CPU使用量の監視と自動制御を担当
 */
export class ScanResourceMonitor {
	private memoryUsageHistory: number[] = [];
	private lastCPUUsage = process.cpuUsage();

	constructor(private settings: ScanSettings) {}

	/**
	 * 現在のメモリ使用量を取得
	 */
	getMemoryUsage(): MemoryUsage {
		const memUsage = process.memoryUsage();
		const usedMB = Math.round(memUsage.heapUsed / (1024 * 1024));
		const totalMB = Math.round(memUsage.heapTotal / (1024 * 1024));
		const usagePercent = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

		// メモリ使用量履歴を更新
		this.memoryUsageHistory.push(usedMB);
		if (this.memoryUsageHistory.length > SCAN.MEMORY_USAGE_HISTORY_SIZE) {
			this.memoryUsageHistory.shift();
		}

		return {
			used: usedMB,
			total: totalMB,
			usagePercent,
		};
	}

	/**
	 * 現在のCPU使用率を取得
	 */
	getCPUUsage(): CPUUsage {
		const currentUsage = process.cpuUsage(this.lastCPUUsage);
		this.lastCPUUsage = process.cpuUsage();

		const totalTime = currentUsage.user + currentUsage.system;
		const percent = totalTime > 0 ? Math.round((totalTime / 1000000) * 100) : 0; // マイクロ秒から%に変換

		return {
			user: Math.round(currentUsage.user / 1000), // マイクロ秒からミリ秒
			system: Math.round(currentUsage.system / 1000),
			percent: Math.min(percent, 100), // 100%でキャップ
		};
	}

	/**
	 * メモリ使用量に基づいて最適なバッチサイズを計算
	 */
	calculateOptimalBatchSize(): number {
		const memUsage = this.getMemoryUsage();
		let batchSize = this.settings.batchSize;

		// メモリ使用量によるバッチサイズ調整
		if (memUsage.usagePercent > SCAN.MEMORY_HIGH_THRESHOLD) {
			// メモリ使用量が高い場合はバッチサイズを削減
			batchSize = Math.max(
				Math.floor(batchSize * SCAN.BATCH_SIZE_REDUCTION_RATIO),
				SCAN.MIN_BATCH_SIZE_AFTER_REDUCTION,
			);
			console.log(
				`📉 Reducing batch size due to high memory usage: ${batchSize} (Memory: ${memUsage.used}MB, ${memUsage.usagePercent}%)`,
			);
		} else if (
			memUsage.usagePercent < SCAN.MEMORY_LOW_THRESHOLD &&
			this.memoryUsageHistory.length >= 3
		) {
			// メモリ使用量が低く、履歴も安定している場合はバッチサイズを増加
			const avgUsage =
				this.memoryUsageHistory.reduce((a, b) => a + b, 0) /
				this.memoryUsageHistory.length;
			if (avgUsage < this.settings.memoryThresholdMB * 0.5) {
				batchSize = Math.min(
					Math.floor(batchSize * SCAN.BATCH_SIZE_INCREASE_RATIO),
					SCAN.MAX_BATCH_SIZE,
				);
				console.log(
					`📈 Increasing batch size due to low memory usage: ${batchSize} (Avg Memory: ${Math.round(avgUsage)}MB)`,
				);
			}
		}

		// 処理優先度による調整
		switch (this.settings.processingPriority) {
			case "low":
				batchSize = Math.floor(batchSize * SCAN.LOW_PRIORITY_RATIO);
				break;
			case "high":
				batchSize = Math.floor(batchSize * SCAN.HIGH_PRIORITY_RATIO);
				break;
			default:
				// 変更なし
				break;
		}

		return Math.max(batchSize, SCAN.MIN_BATCH_SIZE);
	}

	/**
	 * システムリソースの全体的な状況をチェック
	 */
	checkSystemResources(): {
		memoryOK: boolean;
		cpuOK: boolean;
		shouldPause: boolean;
		message?: string;
	} {
		const memUsage = this.getMemoryUsage();
		const cpuUsage = this.getCPUUsage();

		const memoryOK = memUsage.used <= this.settings.memoryThresholdMB;
		const cpuOK =
			!this.settings.autoPauseOnHighCPU ||
			cpuUsage.percent <= this.settings.autoPauseThreshold;

		let shouldPause = false;
		let message: string | undefined;

		if (!memoryOK) {
			shouldPause = true;
			message = `メモリ使用量がしきい値を超過: ${memUsage.used}MB > ${this.settings.memoryThresholdMB}MB`;
		} else if (!cpuOK) {
			shouldPause = true;
			message = `CPU使用率がしきい値を超過: ${cpuUsage.percent}% > ${this.settings.autoPauseThreshold}%`;
		}

		// 時間帯による自動一時停止チェック
		if (this.settings.autoPauseTimeRange.enabled) {
			const currentHour = new Date().getHours();
			const { startHour, endHour } = this.settings.autoPauseTimeRange;

			let inPauseTime = false;
			if (startHour <= endHour) {
				// 同日内の時間範囲
				inPauseTime = currentHour >= startHour && currentHour < endHour;
			} else {
				// 日をまたぐ時間範囲
				inPauseTime = currentHour >= startHour || currentHour < endHour;
			}

			if (inPauseTime && !shouldPause) {
				shouldPause = true;
				message = `指定時間帯による自動一時停止 (${startHour}:00-${endHour}:00)`;
			}
		}

		return {
			memoryOK,
			cpuOK,
			shouldPause,
			message,
		};
	}

	/**
	 * メモリ使用量履歴をリセット
	 */
	resetMemoryHistory(): void {
		this.memoryUsageHistory = [];
	}
}
