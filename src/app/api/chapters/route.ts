import { type NextRequest, NextResponse } from "next/server";
import {
	extractVideoChapters,
	convertChaptersToWebVTT,
} from "@/services/chapterService";
import { findFileInVideoDirectories } from "@/libs/fileUtils";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const filePath = searchParams.get("filePath");
		const format = searchParams.get("format"); // "json" or "webvtt"

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
				{ status: 400 },
			);
		}

		const decodedPath = decodeURIComponent(filePath);

		// ファイルの存在確認
		const fileValidation = await findFileInVideoDirectories(decodedPath);
		if (!fileValidation.isValid || !fileValidation.exists) {
			return NextResponse.json(
				{ error: "Video file not found" },
				{ status: 404 },
			);
		}

		// チャプター情報を抽出
		const chapters = await extractVideoChapters(fileValidation.fullPath);

		if (format === "webvtt") {
			// WebVTT形式で返す（HTML5 video要素用）
			const webvtt = convertChaptersToWebVTT(chapters);
			return new NextResponse(webvtt, {
				headers: {
					"Content-Type": "text/vtt; charset=utf-8",
					"Cache-Control": "public, max-age=86400", // 24時間キャッシュ
				},
			});
		}

		// JSON形式で返す（デフォルト）
		return NextResponse.json({
			success: true,
			chapters,
			hasChapters: chapters.length > 0,
		});
	} catch (error) {
		console.error("Error extracting video chapters:", error);
		return NextResponse.json(
			{ error: "Failed to extract video chapters" },
			{ status: 500 },
		);
	}
}
