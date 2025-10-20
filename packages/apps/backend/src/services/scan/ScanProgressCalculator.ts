import { SCAN } from "../../utils/constants";

interface ProgressMetrics {
	processingSpeed: number; // ファイル/秒
	estimatedTimeRemaining: number; // 秒
	totalElapsedTime: number; // 秒
	currentPhaseElapsed: number; // 秒
}

/**
 * スキャン進捗計算クラス
 * 処理速度・残り時間の計算を担当
 */
export class ScanProgressCalculator {
	private progressWindow: Array<{ timestamp: number; processedFiles: number }> =
		[];
	private totalStartTime: number | null = null;
	private phaseStartTime: number | null = null;

	/**
	 * 全体スキャン開始時刻を記録
	 */
	startTotalTimer(): void {
		this.totalStartTime = Date.now();
		this.resetPhaseTimer();
	}

	/**
	 * フェーズタイマーをリセット
	 */
	resetPhaseTimer(): void {
		this.phaseStartTime = Date.now();
	}

	/**
	 * 進捗メトリクスを計算
	 */
	calculateProgressMetrics(
		processedFiles: number,
		totalFiles: number,
	): ProgressMetrics {
		const now = Date.now();

		// 進捗履歴を更新
		this.progressWindow.push({ timestamp: now, processedFiles });

		// 古いデータを削除（30秒間のウィンドウ）
		const windowStart = now - SCAN.PROGRESS_WINDOW_DURATION_SEC * 1000;
		this.progressWindow = this.progressWindow.filter(
			(entry) => entry.timestamp >= windowStart,
		);

		// 処理速度を計算（移動平均）
		let processingSpeed = 0;
		if (this.progressWindow.length >= 2) {
			const oldest = this.progressWindow[0];
			const newest = this.progressWindow[this.progressWindow.length - 1];
			const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // 秒
			const filesDiff = newest.processedFiles - oldest.processedFiles;

			if (timeDiff > 0) {
				processingSpeed = filesDiff / timeDiff;
			}
		}

		// 推定残り時間を計算
		let estimatedTimeRemaining = 0;
		if (processingSpeed > 0) {
			const remainingFiles = totalFiles - processedFiles;
			estimatedTimeRemaining = remainingFiles / processingSpeed;
		}

		// 経過時間を計算
		const totalElapsedTime = this.totalStartTime
			? (now - this.totalStartTime) / 1000
			: 0;
		const currentPhaseElapsed = this.phaseStartTime
			? (now - this.phaseStartTime) / 1000
			: 0;

		return {
			processingSpeed: Math.round(processingSpeed * 100) / 100, // 小数点以下2桁
			estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
			totalElapsedTime: Math.round(totalElapsedTime),
			currentPhaseElapsed: Math.round(currentPhaseElapsed),
		};
	}

	/**
	 * 時間を人間が読める形式にフォーマット
	 */
	formatDuration(seconds: number): string {
		if (seconds < 60) {
			return `${seconds}秒`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		if (minutes < 60) {
			return remainingSeconds > 0
				? `${minutes}分${remainingSeconds}秒`
				: `${minutes}分`;
		}

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		return remainingMinutes > 0
			? `${hours}時間${remainingMinutes}分`
			: `${hours}時間`;
	}

	/**
	 * 進捗履歴をリセット
	 */
	resetProgress(): void {
		this.progressWindow = [];
		this.totalStartTime = null;
		this.phaseStartTime = null;
	}

	/**
	 * 現在の処理速度（直近）を取得
	 */
	getCurrentSpeed(): number {
		if (this.progressWindow.length < 2) {
			return 0;
		}

		const recent = this.progressWindow.slice(-2);
		const timeDiff = (recent[1].timestamp - recent[0].timestamp) / 1000;
		const filesDiff = recent[1].processedFiles - recent[0].processedFiles;

		return timeDiff > 0 ? filesDiff / timeDiff : 0;
	}

	/**
	 * フェーズの開始時刻を取得
	 */
	get currentPhaseStartTime(): number | null {
		return this.phaseStartTime;
	}

	/**
	 * 全体の開始時刻を取得
	 */
	get totalScanStartTime(): number | null {
		return this.totalStartTime;
	}
}
