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
		| "control_cancel";
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
		console.log(`🏪 SSEConnectionStore created: ${this.instanceId}`);
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
			console.warn(
				`🔌 Connection ${connection.id} already exists, skipping...`,
			);
			return;
		}

		this.connections.set(connection.id, connection);
		console.log(
			`🔌 Connection added: ${connection.id} (total: ${this.connections.size}) [Store: ${this.instanceId}]`,
		);

		// React StrictMode警告
		if (this.connections.size > 1) {
			console.warn(
				`⚠️ Multiple connections detected (${this.connections.size}). This might be due to React StrictMode.`,
			);
		}

		// 新しい接続に最新の進捗状態を送信
		if (this.lastProgressEvent && this.currentScanId) {
			console.log(
				`📡 Sending latest progress to new connection: ${this.lastProgressEvent.type} ${this.lastProgressEvent.progress}%`,
			);
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
			console.log(
				`🔌 Connection removed: ${connectionId} (total: ${this.connections.size}) [Store: ${this.instanceId}]`,
			);
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
		} catch (error) {
			console.warn(`❌ Failed to send to connection ${connectionId}:`, error);
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
			console.log(
				"📡 No active connections, progress stored for future connections",
			);
		} else {
			console.log(
				`📡 Broadcasting to ${this.connections.size} connections [Store: ${this.instanceId}]`,
			);
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
		let successCount = 0;
		const connectionIds = Array.from(this.connections.keys());

		for (const connectionId of connectionIds) {
			if (this.sendToConnection(connectionId, message)) {
				successCount++;
			}
		}

		console.log(
			`📡 Broadcast result: ${successCount}/${connectionIds.length} successful`,
		);
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
		console.log(
			`📊 Connection count: ${this.connections.size} [Store: ${this.instanceId}]`,
		);
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
		console.log("🧹 Scan state cleared");
	}

	/**
	 * 無効な接続をクリーンアップ（定期実行推奨）
	 */
	cleanup(): void {
		const now = new Date();
		const timeoutMs = 30 * 60 * 1000; // 30分

		for (const [id, connection] of this.connections) {
			if (now.getTime() - connection.lastHeartbeat.getTime() > timeoutMs) {
				console.log(`🗑️ Cleaning up stale connection: ${id}`);
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
