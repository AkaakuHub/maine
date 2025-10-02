import { Controller, Get, Head, Req } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import {
	type SSEConnection,
	sseStore,
} from "../../common/sse/sse-connection.store";

@ApiTags("scan")
@Controller("scan")
export class SseController {
	@Get("events")
	@ApiResponse({ status: 200, description: "SSEイベントストリーム" })
	async getScanEvents(@Req() request: Request) {
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

				// 接続オブジェクトを作成
				const connection: SSEConnection = {
					id: connectionId,
					controller,
					createdAt: new Date(),
					lastHeartbeat: new Date(),
					metadata: {
						userAgent: request.headers["user-agent"]?.slice(0, 50),
					},
				};

				// SSE Connection Storeに接続を登録
				sseStore.addConnection(connection);
				// SSE connection registered

				// 接続確立メッセージを送信
				const encoder = new TextEncoder();
				const connectMessage = `data: ${JSON.stringify({
					type: "connected",
					connectionId,
					timestamp: new Date().toISOString(),
					message: "SSE接続が確立されました",
					activeConnections: sseStore.getConnectionCount(),
				})}\n\n`;
				controller.enqueue(encoder.encode(connectMessage));

				// 現在のスキャン状態があれば送信
				const currentState = sseStore.getCurrentScanState();
				console.log("Current scan state for new connection:", {
					hasLastEvent: !!currentState.lastEvent,
					scanId: currentState.scanId,
					connectionCount: currentState.connectionCount,
				});

				// 定期的なハートビート（30秒ごと）
				const heartbeatInterval = setInterval(() => {
					try {
						sseStore.sendHeartbeat();
					} catch (error) {
						console.warn("❌ Heartbeat failed:", error);
						clearInterval(heartbeatInterval);
					}
				}, 30000);

				// 接続終了時のクリーンアップ
				if (request.destroyed) {
					// SSE connection disconnected

					// Connection Storeから削除
					sseStore.removeConnection(connectionId);
					clearInterval(heartbeatInterval);

					try {
						controller.close();
					} catch (_error) {
						// 既に閉じられている場合は無視
					}
				}

				// Expressリクエストの場合のクリーンアップ
				const cleanup = () => {
					sseStore.removeConnection(connectionId);
					clearInterval(heartbeatInterval);
					try {
						controller.close();
					} catch (_error) {
						// 既に閉じられている場合は無視
					}
				};

				// リクエスト終了時のイベントリスナー
				request.on("close", cleanup);
				request.on("end", cleanup);
			},

			cancel() {
				// ストリーム終了時のクリーンアップ
				// SSE stream cancelled
			},
		});

		return new Response(stream, { headers: responseHeaders });
	}

	@Head("events")
	@ApiResponse({ status: 200, description: "SSE健全性チェック" })
	async healthCheck() {
		const headers = new Headers({
			"Cache-Control": "no-cache",
		});

		return new Response(null, {
			status: 200,
			headers,
		});
	}
}
