/**
 * SSE Connection Store
 *
 * EventEmitterを使わずにシンプルな接続管理を行うクラス
 * Next.js 15 App Router環境での安定動作を保証
 */

export interface SSEConnection {
	id: string;
	controller: ReadableStreamDefaultController;
	createdAt: Date;
	lastHeartbeat: Date;
	metadata: {
		userAgent?: string;
		ip?: string;
	};
}

export interface ScanProgressEvent {
	type:
		| "progress"
		| "phase"
		| "complete"
		| "error"
		| "connected"
		| "heartbeat"
		| "control_pause"
		| "control_resume"
		| "control_cancel"
		| "scan_stats" // 差分スキャン統計
		| "scheduler_status"; // スケジューラー状態
	scanId?: string;
	phase?: "discovery" | "metadata" | "database";
	progress?: number; // 0-100
	processedFiles?: number;
	totalFiles?: number;
	currentFile?: string;
	message?: string;
	error?: string;
	timestamp?: string;
	connectionId?: string;
	activeConnections?: number;
	processingSpeed?: number;
	estimatedTimeRemaining?: number;
	phaseStartTime?: string;
	totalElapsedTime?: number;
	currentPhaseElapsed?: number;
	// スキップ統計情報
	skipStats?: {
		totalFiles: number;
		newFiles: number;
		changedFiles: number;
		unchangedFiles: number; // スキップされたファイル数
		deletedFiles: number; // 削除されたファイル数
		unchangedPercentage: number;
	};
}

export class SSEConnectionStore {
	private static instance: SSEConnectionStore;
	private connections = new Map<string, SSEConnection>();
	private lastProgressEvent: ScanProgressEvent | null = null;
	private currentScanId: string | null = null;

	// デバッグ用インスタンスID
	public readonly instanceId: string;

	private constructor() {
		this.instanceId = `store_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
		// SSEConnectionStore created
	}

	static getInstance(): SSEConnectionStore {
		if (!SSEConnectionStore.instance) {
			SSEConnectionStore.instance = new SSEConnectionStore();
		}
		return SSEConnectionStore.instance;
	}

	/**
	 * 接続を追加
	 */
	addConnection(connection: SSEConnection): void {
		if (this.connections.has(connection.id)) {
			// Connection already exists
			return;
		}

		this.connections.set(connection.id, connection);
		// Connection added

		// React StrictMode警告
		if (this.connections.size > 1) {
			// Multiple connections detected (React StrictMode)
		}

		// 新しい接続に最新の進捗状態を送信
		if (this.lastProgressEvent && this.currentScanId) {
			// Sending latest progress to new connection
			const eventToSend = this.lastProgressEvent;
			setTimeout(() => {
				this.sendToConnection(connection.id, eventToSend);
			}, 100);
		}
	}

	/**
	 * 接続を削除
	 */
	removeConnection(connectionId: string): void {
		if (this.connections.delete(connectionId)) {
			// Connection removed
		}
	}

	/**
	 * 特定の接続にメッセージを送信
	 */
	private sendToConnection(
		connectionId: string,
		message: ScanProgressEvent,
	): boolean {
		const connection = this.connections.get(connectionId);
		if (!connection) {
			return false;
		}

		try {
			const encoder = new TextEncoder();
			const data = `data: ${JSON.stringify({
				...message,
				timestamp: message.timestamp || new Date().toISOString(),
				activeConnections: this.connections.size,
			})}\n\n`;

			connection.controller.enqueue(encoder.encode(data));
			connection.lastHeartbeat = new Date();
			return true;
		} catch {
			// Failed to send to connection
			// 無効な接続を削除
			this.removeConnection(connectionId);
			return false;
		}
	}

	/**
	 * 全ての接続にブロードキャスト
	 */
	broadcast(message: ScanProgressEvent): void {
		if (this.connections.size === 0) {
			// No active connections, progress stored for future connections
		} else {
			// Broadcasting to connections
		}

		// 最新の進捗を保存
		this.lastProgressEvent = {
			...message,
			timestamp: new Date().toISOString(),
		};

		if (message.scanId) {
			this.currentScanId = message.scanId;
		}

		// 全接続にブロードキャスト
		const connectionIds = Array.from(this.connections.keys());

		for (const connectionId of connectionIds) {
			this.sendToConnection(connectionId, message);
		}

		// Broadcast completed
	}

	/**
	 * ハートビートを送信
	 */
	sendHeartbeat(): void {
		const heartbeat: ScanProgressEvent = {
			type: "heartbeat",
			timestamp: new Date().toISOString(),
			activeConnections: this.connections.size,
		};

		this.broadcast(heartbeat);
	}

	/**
	 * 接続数を取得
	 */
	getConnectionCount(): number {
		// Connection count logged
		return this.connections.size;
	}

	/**
	 * 現在のスキャン状態を取得
	 */
	getCurrentScanState(): {
		scanId: string | null;
		lastEvent: ScanProgressEvent | null;
		hasActiveConnections: boolean;
		connectionCount: number;
	} {
		return {
			scanId: this.currentScanId,
			lastEvent: this.lastProgressEvent,
			hasActiveConnections: this.connections.size > 0,
			connectionCount: this.connections.size,
		};
	}

	/**
	 * スキャン状態をクリア
	 */
	clearScanState(): void {
		this.currentScanId = null;
		this.lastProgressEvent = null;
		// Scan state cleared
	}

	/**
	 * 無効な接続をクリーンアップ（定期実行推奨）
	 */
	cleanup(): void {
		const now = new Date();
		const timeoutMs = 30 * 60 * 1000; // 30分

		for (const [id, connection] of this.connections) {
			if (now.getTime() - connection.lastHeartbeat.getTime() > timeoutMs) {
				// Cleaning up stale connection
				this.removeConnection(id);
			}
		}
	}
}

// Next.js 15環境でのグローバルインスタンス管理
declare global {
	var __sseConnectionStore: SSEConnectionStore | undefined;
}

// グローバル変数を使用してNext.js環境での共有を保証
if (!globalThis.__sseConnectionStore) {
	globalThis.__sseConnectionStore = SSEConnectionStore.getInstance();
}
export const sseStore = globalThis.__sseConnectionStore;

// 定期的なクリーンアップ（開発環境のみ）
if (typeof window === "undefined") {
	setInterval(
		() => {
			sseStore.cleanup();
		},
		5 * 60 * 1000,
	); // 5分間隔
}
