import { Controller, Get, Head, Res } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
	type SSEConnection,
	sseStore,
} from "../../common/sse/sse-connection.store";

@ApiTags("scan")
@Controller("scan")
export class SseController {
	@Get("events")
	@ApiResponse({ status: 200, description: "SSEイベントストリーム" })
	async getScanEvents(@Res() response: Response) {
		// SSE用のヘッダー設定 - Next.js APIと全く同じ
		const responseHeaders = {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control",
		};

		// レスポンスヘッダーを設定
		for (const [key, value] of Object.entries(responseHeaders)) {
			response.setHeader(key, value);
		}

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
						userAgent: response.req.headers["user-agent"]?.slice(0, 50),
					},
				};

				// SSE Connection Storeに接続を登録
				sseStore.addConnection(connection);

				// 接続確立メッセージを送信
				const encoder = new TextEncoder();
				const connectMessage = `data: ${JSON.stringify({
					type: "connected",
					connectionId,
					timestamp: new Date().toISOString(),
					message: "SSE connection established",
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
				response.req.on("close", () => {
					console.log("SSE connection disconnected");
					// Connection Storeから削除
					sseStore.removeConnection(connectionId);
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
				console.log("SSE stream cancelled");
			},
		});

		// Express ResponseにReadableStreamを直接設定
		// Next.jsの new Response(stream, { headers }) と同等の処理
		response.status(200);

		// ストリームのデータをレスポンスに書き込み
		const reader = stream.getReader();

		const pump = async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						response.end();
						break;
					}
					response.write(Buffer.from(value));
				}
			} catch (error) {
				console.error("Stream error:", error);
				response.end();
			}
		};

		pump();
	}

	@Head("events")
	@ApiResponse({ status: 200, description: "SSE健全性チェック" })
	async healthCheck(@Res() response: Response) {
		response.setHeader("Cache-Control", "no-cache");
		response.status(200).end();
	}
}
