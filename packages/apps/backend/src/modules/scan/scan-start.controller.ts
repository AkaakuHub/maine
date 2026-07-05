import { Controller, Get, Post, Res } from "@nestjs/common";
import { createAppLogger } from "../../common/logger";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { sseStore } from "../../common/sse/sse-connection.store";
import { videoCacheService } from "../../services/videoCacheService";

@ApiTags("scan")
@Controller("scan")
export class ScanStartController {
	private readonly logger = createAppLogger(ScanStartController.name);

	@Post("start")
	@ApiResponse({ status: 200, description: "スキャン開始" })
	@ApiResponse({ status: 409, description: "スキャン実行中" })
	async startScan(@Res({ passthrough: true }) response: Response) {
		try {
			const status = videoCacheService.getUpdateStatus();
			if (status.isUpdating) {
				response.status(409);
				return {
					error: "Scan already in progress",
					message: "スキャンは既に実行中です",
					progress: status.progress,
				};
			}

			videoCacheService.manualRefresh().catch((error) => {
				this.logger.error("Background scan failed:", error);
			});

			return {
				success: true,
				message: "スキャンを開始しました",
				timestamp: new Date().toISOString(),
				activeConnections: sseStore.getConnectionCount(),
			};
		} catch (error) {
			this.logger.error("Scan start API error:", error);

			response.status(500);
			return {
				error: "Failed to start scan",
				message: "スキャンの開始に失敗しました",
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}

	@Get("start")
	@ApiResponse({ status: 200, description: "スキャン状態取得" })
	async getScanStatus() {
		try {
			const status = videoCacheService.getUpdateStatus();

			return {
				success: true,
				isScanning: status.isUpdating,
				progress: status.progress,
				message: status.message,
			};
		} catch (error) {
			this.logger.error("Scan status API error:", error);

			return {
				error: "Failed to get scan status",
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
