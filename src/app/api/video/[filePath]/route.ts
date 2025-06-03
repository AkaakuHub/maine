import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { statSync, createReadStream } from "node:fs";
import { sanitizePath, fileExists } from "@/libs/fileUtils";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ filePath: string }> },
) {
	try {
		const { filePath } = await params;
		const decodedPath = decodeURIComponent(filePath);
		const videoDirectory = process.env.VIDEO_DIRECTORY || "";

		if (!videoDirectory) {
			return new NextResponse("Video directory not configured", {
				status: 500,
			});
		}

		// セキュリティチェック: パストラバーサル攻撃を防ぐ
		const fullPath = sanitizePath(decodedPath, videoDirectory);

		if (!fullPath) {
			console.error("Security violation: Invalid path", {
				filePath: decodedPath,
				videoDirectory,
			});
			return new NextResponse("Forbidden", { status: 403 });
		}

		// ファイルの存在確認
		if (!(await fileExists(fullPath))) {
			console.error("File not found:", fullPath);
			return new NextResponse("File not found", { status: 404 });
		}

		const stat = statSync(fullPath);
		const fileSize = stat.size;
		const range = request.headers.get("range");

		console.log("Streaming video:", { fullPath, fileSize, range });

		// Range リクエストの処理（動画ストリーミング用）
		if (range) {
			const parts = range.replace(/bytes=/, "").split("-");
			const start = Number.parseInt(parts[0], 10);
			const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
			const chunksize = end - start + 1;

			const file = createReadStream(fullPath, { start, end });

			const headers = new Headers({
				"Content-Range": `bytes ${start}-${end}/${fileSize}`,
				"Accept-Ranges": "bytes",
				"Content-Length": chunksize.toString(),
				"Content-Type": "video/mp4",
				"Cache-Control": "public, max-age=31536000",
				"Access-Control-Allow-Origin": "*",
			});

			return new NextResponse(file as unknown as ReadableStream, {
				status: 206,
				headers,
			});
		}

		// Range リクエストがない場合は全体を返す
		const file = createReadStream(fullPath);

		const headers = new Headers({
			"Content-Length": fileSize.toString(),
			"Content-Type": "video/mp4",
			"Accept-Ranges": "bytes",
			"Cache-Control": "public, max-age=31536000",
			"Access-Control-Allow-Origin": "*",
		});

		return new NextResponse(file as unknown as ReadableStream, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Video streaming error:", error);
		return new NextResponse("Internal server error", { status: 500 });
	}
}
