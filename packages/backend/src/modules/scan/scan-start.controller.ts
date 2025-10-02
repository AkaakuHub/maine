import { Controller, Get, Post, Res } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { sseStore } from "../../libs/sse-connection-store";
import { videoCacheService } from "../../services/videoCacheService";

@ApiTags("scan")
@Controller("scan")
export class ScanStartController {
	@Post("start")
	@ApiResponse({ status: 200, description: "スキャン開始" })
	@ApiResponse({ status: 409, description: "スキャン実行中" })
	async startScan(@Res({ passthrough: true }) response: Response) {
		try {
			console.log("Manual scan start requested via API");

			// 既にスキャン中かチェック
			const status = videoCacheService.getUpdateStatus();
			if (status.isUpdating) {
				response.status(409); // Conflict
				return {
					error: "Scan already in progress",
					message: "スキャンは既に実行中です",
					progress: status.progress,
				};
			}

			// スキャンを開始（SSE接続は非同期で確立される）
			console.log(
				"Starting scan - SSE connections will receive progress asynchronously",
			);
			sseStore.getConnectionCount();
			// Current active SSE connections

			// スキャンを非同期で開始（ブロッキングしないように）
			videoCacheService.manualRefresh().catch((error) => {
				console.error("Background scan failed:", error);
			});

			return {
				success: true,
				message: "スキャンを開始しました",
				timestamp: new Date().toISOString(),
				activeConnections: sseStore.getConnectionCount(),
			};
		} catch (error) {
			console.error("Scan start API error:", error);

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
			console.error("Scan status API error:", error);

			return {
				error: "Failed to get scan status",
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
