import type { NextRequest } from "next/server";
import {
	scanEventEmitter,
	type ScanProgressEvent,
	type ScanControlEvent,
} from "@/services/scanEventEmitter";

/**
 * Server-Sent Events (SSE) API Route
 * スキャン進捗のリアルタイム配信
 */
export async function GET(request: NextRequest) {
	// SSE用のヘッダー設定
	const responseHeaders = new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Cache-Control",
	});

	// ReadableStreamを使用してSSEストリームを作成
	const stream = new ReadableStream({
		start(controller) {
			// 接続IDを生成
			const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2)}`;

			// 接続を登録
			scanEventEmitter.addConnection(connectionId);

			// 初期メッセージを送信
			const encoder = new TextEncoder();
			const sendMessage = (
				data:
					| ScanProgressEvent
					| {
							type: string;
							connectionId?: string;
							timestamp: string;
							message?: string;
							activeConnections?: number;
							scanId?: string;
					  },
			) => {
				const message = `data: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			// 接続確立メッセージ
			sendMessage({
				type: "connected",
				connectionId,
				timestamp: new Date().toISOString(),
				message: "SSE connection established",
			});

			// 現在のスキャン状態があれば送信
			const currentState = scanEventEmitter.getCurrentScanState();
			if (currentState.lastEvent) {
				sendMessage(currentState.lastEvent);
			}

			// スキャン進捗イベントのリスナー
			const progressListener = (event: ScanProgressEvent) => {
				sendMessage(event);
			};

			// スキャン制御イベントのリスナー
			const controlListener = (event: ScanControlEvent) => {
				sendMessage({
					type: `control_${event.type}`,
					timestamp: event.timestamp.toISOString(),
					message: `Scan ${event.type} command received`,
					scanId: event.scanId,
				});
			};

			// イベントリスナーを登録
			scanEventEmitter.on("scanProgress", progressListener);
			scanEventEmitter.on("scanControl", controlListener);

			// 定期的なハートビート（30秒ごと）
			const heartbeatInterval = setInterval(() => {
				try {
					sendMessage({
						type: "heartbeat",
						timestamp: new Date().toISOString(),
						activeConnections: scanEventEmitter.getActiveConnectionCount(),
					});
				} catch (_error) {
					// 接続が切れた場合はハートビートを停止
					clearInterval(heartbeatInterval);
				}
			}, 30000);

			// 接続終了時のクリーンアップ
			request.signal.addEventListener("abort", () => {
				scanEventEmitter.removeConnection(connectionId);
				scanEventEmitter.off("scanProgress", progressListener);
				scanEventEmitter.off("scanControl", controlListener);
				clearInterval(heartbeatInterval);

				try {
					controller.close();
				} catch (_error) {
					// 既に閉じられている場合は無視
				}
			});
		},

		cancel() {
			// ストリーム終了時のクリーンアップ
			console.log("📡 SSE stream cancelled");
		},
	});

	return new Response(stream, { headers: responseHeaders });
}

/**
 * SSE接続の健全性チェック用
 */
export async function HEAD() {
	return new Response(null, {
		status: 200,
		headers: {
			"Cache-Control": "no-cache",
		},
	});
}
