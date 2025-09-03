import { EventEmitter } from "node:events";

/**
 * スキャン進捗イベントの型定義
 */
export interface ScanProgressEvent {
	type: "progress" | "phase" | "complete" | "error";
	scanId: string;
	phase: "discovery" | "metadata" | "database";
	progress: number; // 0-100
	processedFiles: number;
	totalFiles: number;
	currentFile?: string;
	message?: string;
	error?: string;
	timestamp: Date;

	// 詳細プログレス情報
	processingSpeed?: number; // ファイル/秒
	estimatedTimeRemaining?: number; // 秒
	phaseStartTime?: Date;
	totalElapsedTime?: number; // 秒
	currentPhaseElapsed?: number; // 秒
}

/**
 * スキャン制御コマンドの型定義
 */
export interface ScanControlEvent {
	type: "pause" | "resume" | "cancel";
	scanId: string;
	timestamp: Date;
}

/**
 * スキャン進捗とユーザー制御のためのEventEmitter
 *
 * VideoCacheService ↔ SSE API Route ↔ フロントエンド間の
 * リアルタイム通信を仲介します
 */
class ScanEventEmitter extends EventEmitter {
	private static instance: ScanEventEmitter;

	// アクティブな接続を追跡
	private activeConnections = new Set<string>();
	private currentScanId: string | null = null;
	private lastProgressEvent: ScanProgressEvent | null = null;

	constructor() {
		super();

		// EventEmitterのメモリリーク警告を防ぐ
		this.setMaxListeners(50);
	}

	/**
	 * シングルトンインスタンス取得
	 */
	static getInstance(): ScanEventEmitter {
		if (!ScanEventEmitter.instance) {
			ScanEventEmitter.instance = new ScanEventEmitter();
		}
		return ScanEventEmitter.instance;
	}

	/**
	 * スキャン進捗イベントを送信
	 */
	emitScanProgress(event: Omit<ScanProgressEvent, "timestamp">): void {
		const fullEvent: ScanProgressEvent = {
			...event,
			timestamp: new Date(),
		};

		this.lastProgressEvent = fullEvent;
		this.currentScanId = event.scanId;

		this.emit("scanProgress", fullEvent);

		// デバッグ用ログ
		console.log(
			`📡 Scan Progress: ${event.type} - ${event.progress}% (${event.processedFiles}/${event.totalFiles}) - Active connections: ${this.activeConnections.size}`,
		);
	}

	/**
	 * スキャン制御コマンドを送信
	 */
	emitScanControl(event: Omit<ScanControlEvent, "timestamp">): void {
		const fullEvent: ScanControlEvent = {
			...event,
			timestamp: new Date(),
		};

		this.emit("scanControl", fullEvent);

		console.log(`🎛️ Scan Control: ${event.type} for scan ${event.scanId}`);
	}

	/**
	 * SSE接続の登録
	 */
	addConnection(connectionId: string): void {
		this.activeConnections.add(connectionId);
		console.log(
			`🔌 SSE Connection added: ${connectionId} (total: ${this.activeConnections.size})`,
		);

		// 新しい接続に最新の進捗状態を送信
		if (this.lastProgressEvent && this.currentScanId) {
			setTimeout(() => {
				this.emit("scanProgress", this.lastProgressEvent);
			}, 100);
		}
	}

	/**
	 * SSE接続の削除
	 */
	removeConnection(connectionId: string): void {
		this.activeConnections.delete(connectionId);
		console.log(
			`🔌 SSE Connection removed: ${connectionId} (total: ${this.activeConnections.size})`,
		);
	}

	/**
	 * アクティブ接続数を取得
	 */
	getActiveConnectionCount(): number {
		return this.activeConnections.size;
	}

	/**
	 * 現在のスキャン状態を取得
	 */
	getCurrentScanState(): {
		scanId: string | null;
		lastEvent: ScanProgressEvent | null;
		hasActiveConnections: boolean;
	} {
		return {
			scanId: this.currentScanId,
			lastEvent: this.lastProgressEvent,
			hasActiveConnections: this.activeConnections.size > 0,
		};
	}

	/**
	 * スキャン完了時のクリーンアップ
	 */
	clearScanState(): void {
		this.currentScanId = null;
		this.lastProgressEvent = null;
		console.log("🧹 Scan state cleared");
	}
}

// シングルトンエクスポート
export const scanEventEmitter = ScanEventEmitter.getInstance();
