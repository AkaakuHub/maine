import type { Response } from "express";
import { SCAN } from "../../utils/constants";

export interface SSEConnection {
	id: string;
	response: Response;
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

const RETAINED_EVENT_TYPES: ReadonlySet<ScanProgressEvent["type"]> = new Set([
	"progress",
	"phase",
	"complete",
	"error",
	"control_pause",
	"control_resume",
	"control_cancel",
	"scan_stats",
	"scheduler_status",
]);

export class SSEConnectionStore {
	private static instance: SSEConnectionStore;
	private connections = new Map<string, SSEConnection>();
	private lastProgressEvent: ScanProgressEvent | null = null;
	private currentScanId: string | null = null;

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
	}

	removeConnection(connectionId: string): void {
		const connection = this.connections.get(connectionId);
		this.connections.delete(connectionId);

		if (
			connection &&
			!connection.response.destroyed &&
			!connection.response.writableEnded
		) {
			connection.response.end();
		}
	}

	sendToConnection(connectionId: string, message: ScanProgressEvent): boolean {
		const connection = this.connections.get(connectionId);
		if (!connection) {
			return false;
		}

		if (connection.response.destroyed || connection.response.writableEnded) {
			this.removeConnection(connectionId);
			return false;
		}

		try {
			const data = `data: ${JSON.stringify({
				...message,
				timestamp: message.timestamp || new Date().toISOString(),
				activeConnections: this.connections.size,
			})}\n\n`;

			connection.response.write(data);
			connection.lastHeartbeat = new Date();
			return true;
		} catch {
			this.removeConnection(connectionId);
			return false;
		}
	}

	broadcast(message: ScanProgressEvent): void {
		if (RETAINED_EVENT_TYPES.has(message.type)) {
			this.lastProgressEvent = {
				...message,
				timestamp: new Date().toISOString(),
			};
		}

		if (message.scanId) {
			this.currentScanId = message.scanId;
		}

		const connectionIds = Array.from(this.connections.keys());
		for (const connectionId of connectionIds) {
			this.sendToConnection(connectionId, message);
		}
	}

	sendHeartbeatToConnection(connectionId: string): boolean {
		const heartbeat: ScanProgressEvent = {
			type: "heartbeat",
			timestamp: new Date().toISOString(),
			activeConnections: this.connections.size,
		};

		return this.sendToConnection(connectionId, heartbeat);
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

		for (const [id, connection] of this.connections) {
			if (
				now.getTime() - connection.lastHeartbeat.getTime() >
				SCAN.SSE_CONNECTION_TIMEOUT_MS
			) {
				this.removeConnection(id);
			}
		}
	}
}

export const sseStore = SSEConnectionStore.getInstance();

if (typeof window === "undefined") {
	setInterval(() => {
		sseStore.cleanup();
	}, SCAN.SSE_CLEANUP_INTERVAL_MS);
}
