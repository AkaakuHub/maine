/**
 * SSE Connection Store
 *
 * Next.jsからNestJSへの移管用
 * 接続管理とリアルタイム配信を行うシングルトンクラス
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
		| "scan_stats"
		| "scheduler_status";
	scanId?: string;
	phase?: "discovery" | "metadata" | "database";
	progress?: number;
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
	skipStats?: {
		totalFiles: number;
		newFiles: number;
		changedFiles: number;
		unchangedFiles: number;
		deletedFiles: number;
		unchangedPercentage: number;
	};
}

export class SSEConnectionStore {
	private static instance: SSEConnectionStore;
	private connections = new Map<string, SSEConnection>();
	private lastProgressEvent: ScanProgressEvent | null = null;
	private currentScanId: string | null = null;

	public readonly instanceId: string;

	private constructor() {
		this.instanceId = `store_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	}

	static getInstance(): SSEConnectionStore {
		if (!SSEConnectionStore.instance) {
			SSEConnectionStore.instance = new SSEConnectionStore();
		}
		return SSEConnectionStore.instance;
	}

	addConnection(connection: SSEConnection): void {
		if (this.connections.has(connection.id)) {
			return;
		}

		this.connections.set(connection.id, connection);

		if (this.connections.size > 1) {
			// Multiple connections detected
		}

		if (this.lastProgressEvent && this.currentScanId) {
			const eventToSend = this.lastProgressEvent;
			setTimeout(() => {
				this.sendToConnection(connection.id, eventToSend);
			}, 100);
		}
	}

	removeConnection(connectionId: string): void {
		this.connections.delete(connectionId);
	}

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
			this.removeConnection(connectionId);
			return false;
		}
	}

	broadcast(message: ScanProgressEvent): void {
		this.lastProgressEvent = {
			...message,
			timestamp: new Date().toISOString(),
		};

		if (message.scanId) {
			this.currentScanId = message.scanId;
		}

		const connectionIds = Array.from(this.connections.keys());
		for (const connectionId of connectionIds) {
			this.sendToConnection(connectionId, message);
		}
	}

	sendHeartbeat(): void {
		const heartbeat: ScanProgressEvent = {
			type: "heartbeat",
			timestamp: new Date().toISOString(),
			activeConnections: this.connections.size,
		};

		this.broadcast(heartbeat);
	}

	getConnectionCount(): number {
		return this.connections.size;
	}

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

	clearScanState(): void {
		this.currentScanId = null;
		this.lastProgressEvent = null;
	}

	cleanup(): void {
		const now = new Date();
		const timeoutMs = 30 * 60 * 1000;

		for (const [id, connection] of this.connections) {
			if (now.getTime() - connection.lastHeartbeat.getTime() > timeoutMs) {
				this.removeConnection(id);
			}
		}
	}
}

export const sseStore = SSEConnectionStore.getInstance();

if (typeof window === "undefined") {
	setInterval(() => {
		sseStore.cleanup();
	}, 5 * 60 * 1000);
}