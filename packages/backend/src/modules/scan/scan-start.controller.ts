import { Controller, Get, Logger, Post, Res } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { sseStore } from "../../common/sse/sse-connection.store";

interface UpdateStatus {
	isUpdating: boolean;
	progress: number;
	message: string;
}

@ApiTags("scan")
@Controller("scan")
export class ScanStartController {
	private readonly logger = new Logger(ScanStartController.name);
	private isUpdating = false;
	private updateProgress = -1;

	@Post("start")
	@ApiResponse({ status: 200, description: "スキャン開始" })
	@ApiResponse({ status: 409, description: "スキャン実行中" })
	async startScan(@Res({ passthrough: true }) response: Response) {
		try {
			console.log("Manual scan start requested via API");

			// 既にスキャン中かチェック
			const status = this.getUpdateStatus();
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
			this.manualRefresh().catch((error) => {
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
			const status = this.getUpdateStatus();

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

	private getUpdateStatus(): UpdateStatus {
		return {
			isUpdating: this.isUpdating,
			progress: this.updateProgress,
			message: this.isUpdating ? "スキャン中..." : "待機中",
		};
	}

	private async manualRefresh(): Promise<{
		success: boolean;
		message: string;
	}> {
		try {
			this.isUpdating = true;
			this.updateProgress = 0;

			// ここに実際のスキャンロジックを実装
			// Next.jsのvideoCacheService.manualRefresh()と同じ処理
			this.logger.log("Starting manual scan refresh");

			// 簡易的なスキャン実行（実際にはもっと複雑な処理）
			for (let i = 0; i <= 100; i += 10) {
				this.updateProgress = i;
				await new Promise((resolve) => setTimeout(resolve, 100)); // 模擬的な処理時間

				// SSEで進捗を送信
				sseStore.broadcast({
					type: "progress",
					progress: i,
					message: `スキャン中... ${i}%`,
					timestamp: new Date().toISOString(),
				});
			}

			this.isUpdating = false;
			this.updateProgress = -1;

			// 完了通知
			sseStore.broadcast({
				type: "complete",
				progress: 100,
				message: "スキャン完了",
				timestamp: new Date().toISOString(),
			});

			return {
				success: true,
				message: "スキャンが完了しました",
			};
		} catch (error) {
			this.isUpdating = false;
			this.updateProgress = -1;

			this.logger.error("Manual refresh failed:", error);

			// エラー通知
			sseStore.broadcast({
				type: "error",
				message: `スキャンエラー: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date().toISOString(),
			});

			return {
				success: false,
				message: "スキャンに失敗しました",
			};
		}
	}
}
