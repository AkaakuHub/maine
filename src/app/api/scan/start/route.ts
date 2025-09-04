import { NextResponse } from "next/server";
import { videoCacheService } from "@/services/videoCacheService";
import { sseStore } from "@/lib/sse-connection-store";

/**
 * スキャン開始API
 * POST /api/scan/start
 *
 * ビデオファイルの完全スキャンを開始します
 */
export async function POST() {
	try {
		console.log("Manual scan start requested via API");

		// 既にスキャン中かチェック
		const status = videoCacheService.getUpdateStatus();
		if (status.isUpdating) {
			return NextResponse.json(
				{
					error: "Scan already in progress",
					message: "スキャンは既に実行中です",
					progress: status.progress,
				},
				{ status: 409 }, // Conflict
			);
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

		return NextResponse.json({
			success: true,
			message: "スキャンを開始しました",
			timestamp: new Date().toISOString(),
			activeConnections: sseStore.getConnectionCount(),
		});
	} catch (error) {
		console.error("Scan start API error:", error);

		return NextResponse.json(
			{
				error: "Failed to start scan",
				message: "スキャンの開始に失敗しました",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

/**
 * スキャン状態を取得
 * GET /api/scan/start
 */
export async function GET() {
	try {
		const status = videoCacheService.getUpdateStatus();

		return NextResponse.json({
			success: true,
			isScanning: status.isUpdating,
			progress: status.progress,
			message: status.message,
		});
	} catch (error) {
		console.error("Scan status API error:", error);

		return NextResponse.json(
			{
				error: "Failed to get scan status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
