/**
 * Scan Store (Zustand)
 *
 * スキャン進捗とSSE接続状態を統一管理するZustandストア
 * EventEmitterの代わりにReactiveな状態管理を提供
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ScanProgressEvent } from "@/libs/sse-connection-store";

interface ScanState {
	// 接続状態
	isConnected: boolean;
	isConnecting: boolean;
	connectionError: string | null;
	connectionCount: number;
	lastHeartbeat: Date | null;

	// スキャン状態
	isScanning: boolean;
	scanId: string | null;
	phase: "discovery" | "metadata" | "database" | null;
	progress: number; // 0-100
	processedFiles: number;
	totalFiles: number;
	currentFile: string | null;
	message: string | null;
	error: string | null;

	// 制御状態
	isPaused: boolean;
	canPause: boolean;
	canResume: boolean;
	canCancel: boolean;

	// 完了状態
	isComplete: boolean;
	completedAt: Date | null;

	// 詳細プログレス情報
	processingSpeed?: number;
	estimatedTimeRemaining?: number;
	phaseStartTime?: Date;
	totalElapsedTime?: number;
	currentPhaseElapsed?: number;

	// スキップ統計情報
	skipStats?: {
		totalFiles: number;
		newFiles: number;
		changedFiles: number;
		unchangedFiles: number;
		deletedFiles: number;
		unchangedPercentage: number;
	};
}

interface ScanActions {
	// 接続制御
	setConnectionState: (connected: boolean, count: number) => void;
	setConnectionError: (error: string | null) => void;
	setHeartbeat: (time: Date) => void;

	// スキャン状態更新
	updateProgress: (event: ScanProgressEvent) => void;
	resetScan: () => void;

	// 制御状態
	setControlState: (
		canPause: boolean,
		canResume: boolean,
		canCancel: boolean,
	) => void;
	setPaused: (paused: boolean) => void;
}

type ScanStore = ScanState & ScanActions;

export const useScanStore = create<ScanStore>()(
	devtools(
		(set) => ({
			// 初期状態
			isConnected: false,
			isConnecting: false,
			connectionError: null,
			connectionCount: 0,
			lastHeartbeat: null,

			isScanning: false,
			scanId: null,
			phase: null,
			progress: 0,
			processedFiles: 0,
			totalFiles: 0,
			currentFile: null,
			message: null,
			error: null,

			isPaused: false,
			canPause: false,
			canResume: false,
			canCancel: false,

			isComplete: false,
			completedAt: null,

			processingSpeed: undefined,
			estimatedTimeRemaining: undefined,
			phaseStartTime: undefined,
			totalElapsedTime: undefined,
			currentPhaseElapsed: undefined,

			skipStats: undefined,

			// アクション
			setConnectionState: (connected, count) =>
				set(
					(state) => ({
						...state,
						isConnected: connected,
						isConnecting: false,
						connectionCount: count,
						connectionError: connected ? null : state.connectionError,
					}),
					false,
					"setConnectionState",
				),

			setConnectionError: (error) =>
				set(
					(state) => ({
						...state,
						connectionError: error,
						isConnected: error ? false : state.isConnected,
					}),
					false,
					"setConnectionError",
				),

			setHeartbeat: (time) =>
				set(
					{
						lastHeartbeat: time,
					},
					false,
					"setHeartbeat",
				),

			updateProgress: (event) =>
				set(
					(state) => {
						const newState = { ...state };

						switch (event.type) {
							case "connected":
								newState.isConnected = true;
								newState.isConnecting = false;
								newState.connectionError = null;
								break;

							case "heartbeat":
								newState.lastHeartbeat = new Date();
								if (event.activeConnections !== undefined) {
									newState.connectionCount = event.activeConnections;
								}
								break;

							case "phase":
								newState.isScanning = true;
								newState.scanId = event.scanId || newState.scanId;
								newState.phase = event.phase || newState.phase;
								newState.progress = event.progress || 0;
								newState.processedFiles = event.processedFiles || 0;
								newState.totalFiles = event.totalFiles || 0;
								newState.message = event.message || null;
								newState.isComplete = false;
								newState.error = null;

								// 詳細プログレス情報
								newState.processingSpeed = event.processingSpeed;
								newState.estimatedTimeRemaining = event.estimatedTimeRemaining;
								newState.phaseStartTime = event.timestamp
									? new Date(event.timestamp)
									: undefined;
								newState.totalElapsedTime = event.totalElapsedTime;
								newState.currentPhaseElapsed = event.currentPhaseElapsed;

								// 制御ボタンを有効化
								newState.canPause = true;
								newState.canCancel = true;
								newState.canResume = false;
								newState.isPaused = false;
								break;

							case "progress":
								newState.isScanning = true;
								newState.scanId = event.scanId || newState.scanId;
								newState.phase = event.phase || newState.phase;
								newState.progress = event.progress || 0;
								newState.processedFiles = event.processedFiles || 0;
								newState.totalFiles = event.totalFiles || newState.totalFiles;
								newState.currentFile = event.currentFile || null;
								newState.message = event.message || null;

								// 詳細プログレス情報
								newState.processingSpeed = event.processingSpeed;
								newState.estimatedTimeRemaining = event.estimatedTimeRemaining;
								newState.totalElapsedTime = event.totalElapsedTime;
								newState.currentPhaseElapsed = event.currentPhaseElapsed;
								break;

							case "complete":
								newState.isScanning = false;
								newState.progress = 100;
								newState.isComplete = true;
								newState.completedAt = new Date();
								newState.message = event.message || "スキャン完了";
								newState.currentFile = null;
								newState.error = null;

								// 詳細プログレス情報（完了時）
								newState.processingSpeed = event.processingSpeed;
								newState.totalElapsedTime = event.totalElapsedTime;

								// 制御を無効化
								newState.canPause = false;
								newState.canResume = false;
								newState.canCancel = false;
								newState.isPaused = false;
								break;

							case "error":
								newState.isScanning = false;
								newState.error = event.error || "Unknown error";
								newState.message = event.message || "エラーが発生しました";
								newState.progress = -1;

								// 制御を無効化
								newState.canPause = false;
								newState.canResume = false;
								newState.canCancel = false;
								newState.isPaused = false;
								break;

							case "scan_stats":
								// スキップ統計情報を更新
								newState.skipStats = event.skipStats;
								newState.message = event.message || newState.message;
								break;
						}

						return newState;
					},
					false,
					`updateProgress:${event.type}`,
				),

			resetScan: () =>
				set(
					(state) => ({
						...state,
						isScanning: false,
						scanId: null,
						phase: null,
						progress: 0,
						processedFiles: 0,
						totalFiles: 0,
						currentFile: null,
						message: null,
						error: null,
						isPaused: false,
						canPause: false,
						canResume: false,
						canCancel: false,
						isComplete: false,
						completedAt: null,
						processingSpeed: undefined,
						estimatedTimeRemaining: undefined,
						phaseStartTime: undefined,
						totalElapsedTime: undefined,
						currentPhaseElapsed: undefined,
					}),
					false,
					"resetScan",
				),

			setControlState: (canPause, canResume, canCancel) =>
				set(
					{
						canPause,
						canResume,
						canCancel,
					},
					false,
					"setControlState",
				),

			setPaused: (paused) =>
				set(
					{
						isPaused: paused,
						canPause: !paused,
						canResume: paused,
					},
					false,
					"setPaused",
				),
		}),
		{
			name: "scan-store",
		},
	),
);
