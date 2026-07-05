import { Controller, Get, Head, Res } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import {
	type SSEConnection,
	sseStore,
} from "../../common/sse/sse-connection.store";
import { isOriginAllowed } from "../../config/cors.config";
import { AllowCookieAuth } from "../../auth/decorators/allow-cookie-auth.decorator";
import { SCAN } from "../../utils/constants";

@ApiTags("scan")
@Controller("scan")
export class SseController {
	@Get("events")
	@AllowCookieAuth()
	@ApiResponse({ status: 200, description: "SSEイベントストリーム" })
	async getScanEvents(@Res() response: Response) {
		const requestOrigin = response.req.headers.origin;
		if (!requestOrigin || !isOriginAllowed(requestOrigin)) {
			response.status(403).end();
			return;
		}

		const responseHeaders = {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": requestOrigin,
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Allow-Headers": "Cache-Control",
			Vary: "Origin",
		};

		for (const [key, value] of Object.entries(responseHeaders)) {
			response.setHeader(key, value);
		}

		response.status(200);
		response.flushHeaders?.();

		const connectionId = `conn_${randomUUID().slice(0, SCAN.SSE_CONNECTION_ID_RANDOM_LENGTH)}`;
		const connection: SSEConnection = {
			id: connectionId,
			response,
			createdAt: new Date(),
			lastHeartbeat: new Date(),
			metadata: {
				userAgent: response.req.headers["user-agent"]?.slice(
					0,
					SCAN.SSE_USER_AGENT_MAX_LENGTH,
				),
				ip: response.req.ip,
			},
		};

		sseStore.addConnection(connection);
		sseStore.sendToConnection(connectionId, {
			type: "connected",
			connectionId,
			message: "SSE connection established",
		});

		const currentState = sseStore.getCurrentScanState();
		if (currentState.lastEvent) {
			sseStore.sendToConnection(connectionId, currentState.lastEvent);
		}

		const heartbeatInterval = setInterval(() => {
			const sent = sseStore.sendHeartbeatToConnection(connectionId);
			if (!sent) {
				clearInterval(heartbeatInterval);
			}
		}, SCAN.SSE_HEARTBEAT_INTERVAL_MS);

		const closeConnection = () => {
			clearInterval(heartbeatInterval);
			sseStore.removeConnection(connectionId);
		};

		response.req.once("close", closeConnection);
		response.req.once("aborted", closeConnection);
	}

	@Head("events")
	@AllowCookieAuth()
	@ApiResponse({ status: 200, description: "SSE健全性チェック" })
	async healthCheck(@Res() response: Response) {
		const requestOrigin = response.req.headers.origin;
		if (requestOrigin && !isOriginAllowed(requestOrigin)) {
			response.status(403).end();
			return;
		}

		response.setHeader("Cache-Control", "no-cache");
		if (requestOrigin) {
			response.setHeader("Access-Control-Allow-Origin", requestOrigin);
			response.setHeader("Access-Control-Allow-Credentials", "true");
			response.setHeader("Vary", "Origin");
		}
		response.status(200).end();
	}
}
