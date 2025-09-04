import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sseStore } from "@/lib/sse-connection-store";

/**
 * スキャン制御API
 * POST /api/scan/control
 *
 * リクエストボディ:
 * {
 *   action: "pause" | "resume" | "cancel",
 *   scanId: string
 * }
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// バリデーション
		if (!body.action || !body.scanId) {
			return NextResponse.json(
				{ error: "action and scanId are required" },
				{ status: 400 },
			);
		}

		const { action, scanId } = body;

		// アクションのバリデーション
		if (!["pause", "resume", "cancel"].includes(action)) {
			return NextResponse.json(
				{ error: "Invalid action. Must be 'pause', 'resume', or 'cancel'" },
				{ status: 400 },
			);
		}

		// 現在のスキャン状態を確認
		const currentState = sseStore.getCurrentScanState();
		if (!currentState.scanId) {
			return NextResponse.json(
				{ error: "No active scan found" },
				{ status: 404 },
			);
		}

		// スキャンIDが一致するかチェック
		if (currentState.scanId !== scanId) {
			return NextResponse.json(
				{
					error: "Scan ID mismatch",
					currentScanId: currentState.scanId,
					requestedScanId: scanId,
				},
				{ status: 400 },
			);
		}

		// 制御コマンドを送信（新しいアーキテクチャでは直接ブロードキャスト）
		sseStore.broadcast({
			type: `control_${action}` as
				| "control_pause"
				| "control_resume"
				| "control_cancel",
			scanId: scanId,
			timestamp: new Date().toISOString(),
			message: `Scan ${action} command received`,
		});

		console.log(`🎛️ Scan control API: ${action} for scan ${scanId}`);

		return NextResponse.json({
			success: true,
			action,
			scanId,
			message: `Scan ${action} command sent successfully`,
		});
	} catch (error) {
		console.error("Scan control API error:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

/**
 * 現在のスキャン状態を取得
 * GET /api/scan/control
 */
export async function GET() {
	try {
		const currentState = sseStore.getCurrentScanState();

		return NextResponse.json({
			success: true,
			scanId: currentState.scanId,
			hasActiveConnections: currentState.hasActiveConnections,
			activeConnections: sseStore.getConnectionCount(),
			lastEvent: currentState.lastEvent,
		});
	} catch (error) {
		console.error("Scan status API error:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
