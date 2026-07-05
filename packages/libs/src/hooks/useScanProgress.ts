"use client";

import { useCallback, useEffect, useRef } from "react";
import { AuthAPI } from "../api/auth";
import type { ScanProgressEvent } from "../libs/sse-connection-store";
import { useScanStore } from "../stores/scan-store";
import { createApiUrl } from "../utils/api";
import { SCAN } from "../utils/constants";

export function useScanProgress() {
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const reconnectAttemptsRef = useRef(0);
	const isConnectingRef = useRef(false);

	const scanId = useScanStore((state) => state.scanId);
	const setConnectionState = useScanStore((state) => state.setConnectionState);
	const setConnectionError = useScanStore((state) => state.setConnectionError);
	const setHeartbeat = useScanStore((state) => state.setHeartbeat);
	const updateProgress = useScanStore((state) => state.updateProgress);
	const resetScan = useScanStore((state) => state.resetScan);

	const connect = useCallback(() => {
		if (
			isConnectingRef.current ||
			eventSourceRef.current?.readyState === EventSource.OPEN
		) {
			return;
		}

		isConnectingRef.current = true;

		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		setConnectionState(false, 0);

		try {
			const eventSource = new EventSource(createApiUrl("/scan/events"), {
				withCredentials: true,
			});
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
				} catch {
					setConnectionError("Invalid SSE message");
				}
			};

			eventSource.onerror = () => {
				isConnectingRef.current = false;

				setConnectionState(false, 0);
				setConnectionError("Connection lost");

				if (reconnectAttemptsRef.current < SCAN.SSE_MAX_RECONNECT_ATTEMPTS) {
					const delay = Math.min(
						SCAN.SSE_RECONNECT_BASE_DELAY_MS *
							2 ** reconnectAttemptsRef.current,
						SCAN.SSE_RECONNECT_MAX_DELAY_MS,
					);
					reconnectAttemptsRef.current += 1;

					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, delay);
				} else {
					setConnectionError("Max reconnection attempts reached");
				}
			};
		} catch {
			isConnectingRef.current = false;
			setConnectionState(false, 0);
			setConnectionError("Failed to connect");
		}
	}, [setConnectionState, setConnectionError, setHeartbeat, updateProgress]);

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

	const reconnect = useCallback(() => {
		reconnectAttemptsRef.current = 0;
		disconnect();
		setTimeout(connect, SCAN.SSE_MANUAL_RECONNECT_DELAY_MS);
	}, [connect, disconnect]);

	const resetScanState = useCallback(() => {
		resetScan();
	}, [resetScan]);

	const sendScanControl = useCallback(
		async (action: "pause" | "resume" | "cancel") => {
			if (!scanId) {
				return false;
			}

			try {
				const response = await fetch(createApiUrl("/scan/control"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...AuthAPI.getAuthHeaders(),
					},
					body: JSON.stringify({
						action,
						scanId: scanId,
					}),
				});

				if (!response.ok) {
					return false;
				}

				await response.json();
				return true;
			} catch {
				return false;
			}
		},
		[scanId],
	);

	const pauseScan = useCallback(async () => {
		return await sendScanControl("pause");
	}, [sendScanControl]);

	const resumeScan = useCallback(async () => {
		return await sendScanControl("resume");
	}, [sendScanControl]);

	const cancelScan = useCallback(async () => {
		return await sendScanControl("cancel");
	}, [sendScanControl]);

	useEffect(() => {
		const timer = setTimeout(() => {
			connect();
		}, SCAN.SSE_INITIAL_CONNECT_DELAY_MS);

		return () => {
			clearTimeout(timer);
			disconnect();
		};
	}, [connect, disconnect]);

	const storeState = useScanStore();

	return {
		...storeState,
		connect,
		disconnect,
		reconnect,
		resetScanState,
		pauseScan,
		resumeScan,
		cancelScan,
		canReconnect:
			reconnectAttemptsRef.current < SCAN.SSE_MAX_RECONNECT_ATTEMPTS,
		reconnectAttempts: reconnectAttemptsRef.current,
	};
}
