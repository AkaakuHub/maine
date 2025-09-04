import { useEffect, useRef, useCallback } from "react";
import { useScanStore } from "@/stores/scan-store";
import type { ScanProgressEvent } from "@/lib/sse-connection-store";

/**
 * Zustandベースのスキャン進捗追跡フック
 *
 * 新しいSSEConnectionStore + Zustandアーキテクチャを使用
 * EventEmitterの代わりにReactiveな状態管理を提供
 */
export function useScanProgress() {
	// EventSource管理用のref
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const isConnectingRef = useRef(false); // 重複接続防止フラグ

	const maxReconnectAttempts = 5;

	// Zustand store から状態とアクションを安定して取得
	const scanId = useScanStore((state) => state.scanId);
	const setConnectionState = useScanStore((state) => state.setConnectionState);
	const setConnectionError = useScanStore((state) => state.setConnectionError);
	const setHeartbeat = useScanStore((state) => state.setHeartbeat);
	const updateProgress = useScanStore((state) => state.updateProgress);
	const resetScan = useScanStore((state) => state.resetScan);

	/**
	 * SSE接続を確立
	 */
	const connect = useCallback(() => {
		// React StrictMode重複接続防止
		if (
			isConnectingRef.current ||
			eventSourceRef.current?.readyState === EventSource.OPEN
		) {
			return;
		}

		isConnectingRef.current = true;

		// 既存接続をクリーンアップ
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		setConnectionState(false, 0);

		try {
			const eventSource = new EventSource("/api/scan/events");
			eventSourceRef.current = eventSource;

			eventSource.onopen = () => {
				reconnectAttemptsRef.current = 0;
				isConnectingRef.current = false;
			};

			eventSource.onmessage = (event) => {
				try {
					const data: ScanProgressEvent = JSON.parse(event.data);

					switch (data.type) {
						case "connected":
							setConnectionState(true, data.activeConnections || 1);
							setConnectionError(null);
							break;

						case "heartbeat":
							if (data.timestamp) {
								setHeartbeat(new Date(data.timestamp));
							}
							if (data.activeConnections !== undefined) {
								setConnectionState(true, data.activeConnections);
							}
							break;

						case "phase":
						case "progress":
						case "complete":
						case "error":
						case "scan_stats":
							updateProgress(data);
							break;
					}
				} catch (parseError) {
					console.warn("Failed to parse SSE message:", parseError);
				}
			};

			eventSource.onerror = (error) => {
				console.warn("SSE connection error:", error);
				isConnectingRef.current = false;

				setConnectionState(false, 0);
				setConnectionError("Connection lost");

				// 自動再接続（指数バックオフ）
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay = Math.min(
						1000 * 2 ** reconnectAttemptsRef.current,
						30000,
					);
					reconnectAttemptsRef.current += 1;

					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, delay);
				} else {
					setConnectionError("Max reconnection attempts reached");
				}
			};
		} catch (error) {
			console.error("Failed to establish SSE connection:", error);
			isConnectingRef.current = false;
			setConnectionState(false, 0);
			setConnectionError("Failed to connect");
		}
	}, [setConnectionState, setConnectionError, setHeartbeat, updateProgress]);

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

		isConnectingRef.current = false;
		setConnectionState(false, 0);
		setConnectionError(null);
	}, [setConnectionState, setConnectionError]);

	/**
	 * 手動再接続
	 */
	const reconnect = useCallback(() => {
		reconnectAttemptsRef.current = 0;
		disconnect();
		setTimeout(connect, 100);
	}, [connect, disconnect]);

	/**
	 * スキャン状態をリセット
	 */
	const resetScanState = useCallback(() => {
		resetScan();
	}, [resetScan]);

	/**
	 * スキャン制御コマンドを送信
	 */
	const sendScanControl = useCallback(
		async (action: "pause" | "resume" | "cancel") => {
			if (!scanId) {
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
						scanId: scanId,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					console.error(`Scan control ${action} failed:`, error);
					return false;
				}

				await response.json();
				return true;
			} catch (error) {
				console.error(`Scan control ${action} request failed:`, error);
				return false;
			}
		},
		[scanId],
	);

	/**
	 * スキャン制御関数
	 */
	const pauseScan = useCallback(async () => {
		return await sendScanControl("pause");
	}, [sendScanControl]);

	const resumeScan = useCallback(async () => {
		return await sendScanControl("resume");
	}, [sendScanControl]);

	const cancelScan = useCallback(async () => {
		return await sendScanControl("cancel");
	}, [sendScanControl]);

	// コンポーネントマウント時に接続開始
	useEffect(() => {
		// React StrictMode対応: 少し遅延してから接続
		const timer = setTimeout(() => {
			connect();
		}, 100);

		// クリーンアップ
		return () => {
			clearTimeout(timer);
			disconnect();
		};
	}, [connect, disconnect]);

	// storeの全状態を返す + 制御関数
	const storeState = useScanStore();

	return {
		// Zustand storeの状態
		...storeState,

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
