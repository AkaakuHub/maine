import {
	Controller,
	Get,
	Post,
	Body,
	Res,
	Logger,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import type { Response } from 'express';
import { sseStore } from "../../common/sse/sse-connection.store";

interface ControlRequestBody {
	action: "pause" | "resume" | "cancel";
	scanId: string;
}

@ApiTags("scan")
@Controller("scan/control")
export class ScanControlController {
	private readonly logger = new Logger(ScanControlController.name);

	@Post()
	@ApiResponse({ status: 200, description: "スキャン制御コマンド送信" })
	@ApiResponse({ status: 400, description: "無効なリクエスト" })
	@ApiResponse({ status: 404, description: "スキャンが見つからない" })
	async controlScan(@Body() body: ControlRequestBody, @Res({ passthrough: true }) response: Response) {
		try {
			this.logger.log(`Scan control command: ${body.action} for scan ${body.scanId}`);

			// バリデーション
			if (!body.action || !body.scanId) {
				response.status(400);
				return { error: "action and scanId are required" };
			}

			// アクションのバリデーション
			if (!["pause", "resume", "cancel"].includes(body.action)) {
				response.status(400);
				return { error: "Invalid action. Must be 'pause', 'resume', or 'cancel'" };
			}

			// 現在のスキャン状態を確認
			const currentState = sseStore.getCurrentScanState();
			if (!currentState.scanId) {
				response.status(404);
				return { error: "No active scan found" };
			}

			// スキャンIDが一致するかチェック
			if (currentState.scanId !== body.scanId) {
				response.status(400);
				return {
					error: "Scan ID mismatch",
					currentScanId: currentState.scanId,
					requestedScanId: body.scanId,
				};
			}

			// 制御コマンドを送信
			sseStore.broadcast({
				type: `control_${body.action}` as
					| "control_pause"
					| "control_resume"
					| "control_cancel",
				scanId: body.scanId,
				timestamp: new Date().toISOString(),
				message: `Scan ${body.action} command received`,
			});

			console.log(`🎛️ Scan control API: ${body.action} for scan ${body.scanId}`);

			return {
				success: true,
				action: body.action,
				scanId: body.scanId,
				message: `Scan ${body.action} command sent successfully`,
			};
		} catch (error) {
			console.error("Scan control API error:", error);
			response.status(500);
			return {
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}

	@Get()
	@ApiResponse({ status: 200, description: "スキャン状態取得" })
	async getScanControlStatus() {
		try {
			const currentState = sseStore.getCurrentScanState();

			return {
				success: true,
				scanId: currentState.scanId,
				hasActiveConnections: currentState.hasActiveConnections,
				activeConnections: sseStore.getConnectionCount(),
				lastEvent: currentState.lastEvent,
			};
		} catch (error) {
			console.error("Scan status API error:", error);
			return {
				success: false,
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}
}