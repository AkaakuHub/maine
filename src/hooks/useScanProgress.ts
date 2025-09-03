import { useState, useEffect, useRef, useCallback } from "react";

/**
 * スキャン進捗イベントの型定義（フロントエンド用）
 */
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

	// 詳細プログレス情報
	processingSpeed?: number; // ファイル/秒
	estimatedTimeRemaining?: number; // 秒
	phaseStartTime?: string;
	totalElapsedTime?: number; // 秒
	currentPhaseElapsed?: number; // 秒
}

/**
 * スキャン進捗の状態
 */
export interface ScanProgressState {
	// 接続状態
	isConnected: boolean;
	isConnecting: boolean;
	connectionError: string | null;
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
}

/**
 * Server-Sent Events を使用したスキャン進捗追跡フック
 *
 * リアルタイムでスキャン進捗を受信し、UI状態を管理します
 */
export function useScanProgress() {
	const [state, setState] = useState<ScanProgressState>({
		// 接続状態
		isConnected: false,
		isConnecting: false,
		connectionError: null,
		lastHeartbeat: null,

		// スキャン状態
		isScanning: false,
		scanId: null,
		phase: null,
		progress: 0,
		processedFiles: 0,
		totalFiles: 0,
		currentFile: null,
		message: null,
		error: null,

		// 制御状態
		isPaused: false,
		canPause: false,
		canResume: false,
		canCancel: false,

		// 完了状態
		isComplete: false,
		completedAt: null,

		// 詳細プログレス情報
		processingSpeed: undefined,
		estimatedTimeRemaining: undefined,
		phaseStartTime: undefined,
		totalElapsedTime: undefined,
		currentPhaseElapsed: undefined,
	});

	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const maxReconnectAttempts = 5;

	/**
	 * SSE接続を確立
	 */
	const connect = useCallback(() => {
		// 既存接続をクリーンアップ
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		setState((prev) => ({
			...prev,
			isConnecting: true,
			connectionError: null,
		}));

		try {
			const eventSource = new EventSource("/api/scan/events");
			eventSourceRef.current = eventSource;

			eventSource.onopen = () => {
				console.log("📡 SSE connection established");
				reconnectAttemptsRef.current = 0;

				setState((prev) => ({
					...prev,
					isConnected: true,
					isConnecting: false,
					connectionError: null,
				}));
			};

			eventSource.onmessage = (event) => {
				try {
					const data: ScanProgressEvent = JSON.parse(event.data);
					console.log(
						"📡 SSE received:",
						data.type,
						data.scanId,
						data.progress,
						data.phase,
					);

					setState((prev) => {
						const newState = { ...prev };

						switch (data.type) {
							case "connected":
								newState.isConnected = true;
								newState.isConnecting = false;
								break;

							case "heartbeat":
								newState.lastHeartbeat = new Date();
								break;

							case "phase":
								newState.isScanning = true;
								newState.scanId = data.scanId || null;
								newState.phase = data.phase || null;
								newState.progress = data.progress || 0;
								newState.processedFiles = data.processedFiles || 0;
								newState.totalFiles = data.totalFiles || 0;
								newState.message = data.message || null;
								newState.isComplete = false;
								// 詳細プログレス情報を更新
								newState.processingSpeed = data.processingSpeed;
								newState.estimatedTimeRemaining = data.estimatedTimeRemaining;
								newState.phaseStartTime = data.phaseStartTime
									? new Date(data.phaseStartTime)
									: undefined;
								newState.totalElapsedTime = data.totalElapsedTime;
								newState.currentPhaseElapsed = data.currentPhaseElapsed;
								// スキャン開始時に制御ボタンを有効化
								newState.canPause = true;
								newState.canCancel = true;
								newState.canResume = false;
								newState.isPaused = false;
								break;

							case "progress":
								newState.isScanning = true;
								newState.scanId = data.scanId || prev.scanId;
								newState.phase = data.phase || prev.phase;
								newState.progress = data.progress || 0;
								newState.processedFiles = data.processedFiles || 0;
								newState.totalFiles = data.totalFiles || prev.totalFiles;
								newState.currentFile = data.currentFile || null;
								newState.message = data.message || null;
								// 詳細プログレス情報を更新
								newState.processingSpeed = data.processingSpeed;
								newState.estimatedTimeRemaining = data.estimatedTimeRemaining;
								newState.phaseStartTime = data.phaseStartTime
									? new Date(data.phaseStartTime)
									: undefined;
								newState.totalElapsedTime = data.totalElapsedTime;
								newState.currentPhaseElapsed = data.currentPhaseElapsed;
								break;

							case "complete":
								newState.isScanning = false;
								newState.progress = 100;
								newState.isComplete = true;
								newState.completedAt = new Date();
								newState.message = data.message || "スキャン完了";
								newState.currentFile = null;
								// 詳細プログレス情報を更新（完了時）
								newState.processingSpeed = data.processingSpeed;
								newState.estimatedTimeRemaining = data.estimatedTimeRemaining;
								newState.phaseStartTime = data.phaseStartTime
									? new Date(data.phaseStartTime)
									: undefined;
								newState.totalElapsedTime = data.totalElapsedTime;
								newState.currentPhaseElapsed = data.currentPhaseElapsed;
								break;

							case "error":
								newState.isScanning = false;
								newState.error = data.error || "Unknown error";
								newState.message = data.message || "エラーが発生しました";
								newState.progress = -1;
								// エラー時は制御を無効化
								newState.canPause = false;
								newState.canResume = false;
								newState.canCancel = false;
								break;

							case "control_pause":
								newState.isPaused = true;
								newState.canPause = false;
								newState.canResume = true;
								newState.canCancel = true;
								newState.message = "スキャンが一時停止されました";
								break;

							case "control_resume":
								newState.isPaused = false;
								newState.canPause = true;
								newState.canResume = false;
								newState.canCancel = true;
								newState.message = "スキャンが再開されました";
								break;

							case "control_cancel":
								newState.isScanning = false;
								newState.isPaused = false;
								newState.canPause = false;
								newState.canResume = false;
								newState.canCancel = false;
								newState.message = "スキャンがキャンセルされました";
								break;
						}

						return newState;
					});
				} catch (parseError) {
					console.warn("Failed to parse SSE message:", parseError);
				}
			};

			eventSource.onerror = (error) => {
				console.warn("📡 SSE connection error:", error);

				setState((prev) => ({
					...prev,
					isConnected: false,
					isConnecting: false,
					connectionError: "Connection lost",
				}));

				// 自動再接続（指数バックオフ）
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay = Math.min(
						1000 * 2 ** reconnectAttemptsRef.current,
						30000,
					);
					reconnectAttemptsRef.current += 1;

					console.log(
						`📡 Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`,
					);

					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, delay);
				} else {
					setState((prev) => ({
						...prev,
						connectionError: "Max reconnection attempts reached",
					}));
				}
			};
		} catch (error) {
			console.error("Failed to establish SSE connection:", error);
			setState((prev) => ({
				...prev,
				isConnected: false,
				isConnecting: false,
				connectionError: "Failed to connect",
			}));
		}
	}, []);

	/**
	 * SSE接続を切断
	 */
	const disconnect = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		setState((prev) => ({
			...prev,
			isConnected: false,
			isConnecting: false,
			connectionError: null,
		}));

		console.log("📡 SSE connection disconnected");
	}, []);

	/**
	 * 手動再接続
	 */
	const reconnect = useCallback(() => {
		reconnectAttemptsRef.current = 0;
		disconnect();
		setTimeout(connect, 100);
	}, [connect, disconnect]);

	/**
	 * スキャン状態をリセット（新しいスキャン開始前など）
	 */
	const resetScanState = useCallback(() => {
		setState((prev) => ({
			...prev,
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
			// 詳細プログレス情報もリセット
			processingSpeed: undefined,
			estimatedTimeRemaining: undefined,
			phaseStartTime: undefined,
			totalElapsedTime: undefined,
			currentPhaseElapsed: undefined,
		}));
	}, []);

	// コンポーネントマウント時に接続開始
	useEffect(() => {
		connect();

		// クリーンアップ
		return () => {
			disconnect();
		};
	}, [connect, disconnect]);

	/**
	 * スキャン制御コマンドを送信
	 */
	const sendScanControl = useCallback(
		async (action: "pause" | "resume" | "cancel") => {
			if (!state.scanId) {
				console.warn("No active scan ID found");
				return false;
			}

			try {
				const response = await fetch("/api/scan/control", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						action,
						scanId: state.scanId,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					console.error(`Scan control ${action} failed:`, error);
					return false;
				}

				const result = await response.json();
				console.log(`🎛️ Scan control ${action} successful:`, result);
				return true;
			} catch (error) {
				console.error(`Scan control ${action} request failed:`, error);
				return false;
			}
		},
		[state.scanId],
	);

	/**
	 * スキャンを一時停止
	 */
	const pauseScan = useCallback(async () => {
		return await sendScanControl("pause");
	}, [sendScanControl]);

	/**
	 * スキャンを再開
	 */
	const resumeScan = useCallback(async () => {
		return await sendScanControl("resume");
	}, [sendScanControl]);

	/**
	 * スキャンをキャンセル
	 */
	const cancelScan = useCallback(async () => {
		return await sendScanControl("cancel");
	}, [sendScanControl]);

	return {
		...state,

		// 制御関数
		connect,
		disconnect,
		reconnect,
		resetScanState,

		// スキャン制御関数
		pauseScan,
		resumeScan,
		cancelScan,

		// ヘルパー
		canReconnect: reconnectAttemptsRef.current < maxReconnectAttempts,
		reconnectAttempts: reconnectAttemptsRef.current,
	};
}
