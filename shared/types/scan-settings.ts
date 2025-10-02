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
	maxConcurrentOperations: number; // メタデータ処理の並列実行数
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