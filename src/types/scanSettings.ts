/**
 * スキャン設定の型定義
 */

export interface ScanSettings {
	// 基本設定
	batchSize: number; // バッチサイズ（1-200）
	progressUpdateInterval: number; // 進捗更新間隔（ファイル数）
	sleepInterval: number; // CPU休憩時間（ms）

	// パフォーマンス設定
	processingPriority: "low" | "normal" | "high"; // 処理優先度
	maxConcurrentOperations: number; // 最大並行処理数（将来拡張用）
	memoryThresholdMB: number; // メモリ使用量しきい値

	// 一時停止設定
	autoPauseOnHighCPU: boolean; // 高CPU使用率時の自動一時停止
	autoPauseThreshold: number; // CPU使用率しきい値（%）
	autoPauseTimeRange: {
		enabled: boolean;
		startHour: number; // 0-23
		endHour: number; // 0-23
	}; // 時間帯による自動一時停止

	// デバッグ・監視設定
	enableDetailedLogging: boolean; // 詳細ログ出力
	showResourceMonitoring: boolean; // リソース監視表示
	enablePerformanceMetrics: boolean; // パフォーマンス指標
}

export const DEFAULT_SCAN_SETTINGS: ScanSettings = {
	// 基本設定（安全な値）
	batchSize: 50,
	progressUpdateInterval: 100,
	sleepInterval: 1,

	// パフォーマンス設定（バランス型）
	processingPriority: "normal",
	maxConcurrentOperations: 1,
	memoryThresholdMB: 100,

	// 一時停止設定（無効）
	autoPauseOnHighCPU: false,
	autoPauseThreshold: 80,
	autoPauseTimeRange: {
		enabled: false,
		startHour: 9, // 9時から
		endHour: 18, // 18時まで
	},

	// デバッグ・監視設定（有効）
	enableDetailedLogging: true,
	showResourceMonitoring: true,
	enablePerformanceMetrics: true,
};

export const SCAN_SETTINGS_CONSTRAINTS = {
	batchSize: { min: 1, max: 200 },
	progressUpdateInterval: { min: 10, max: 1000 },
	sleepInterval: { min: 0, max: 100 },
	maxConcurrentOperations: { min: 1, max: 8 },
	memoryThresholdMB: { min: 50, max: 1000 },
	autoPauseThreshold: { min: 50, max: 95 },
} as const;
