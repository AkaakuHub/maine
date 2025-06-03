import { NextResponse } from "next/server";
import { VideoScanService } from "@/services/videoScanService";

export async function GET() {
	try {
		const result = await VideoScanService.updateDatabase();

		if (!result.success) {
			return NextResponse.json(
				{ error: result.message, details: result.error },
				{ status: result.error === "Configuration error" ? 500 : 404 },
			);
		}

		return NextResponse.json({
			message: result.message,
			stats: result.stats,
		});
	} catch (error) {
		console.error("Database update error:", error);
		return NextResponse.json(
			{
				error: "Failed to update database",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
