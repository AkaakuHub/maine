import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createReadStream, statSync } from "node:fs";
import { findFileInVideoDirectories } from "@/libs/fileUtils";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const filePath = url.searchParams.get("filePath");

		if (!filePath) {
			return new NextResponse("File path is required", { status: 400 });
		}

		// セキュアなファイルパス検証（複数ディレクトリ対応）
		const validation = await findFileInVideoDirectories(filePath);
		if (!validation.isValid) {
			console.error("Invalid file path:", validation.error);
			return new NextResponse(validation.error || "Invalid file path", {
				status:
					validation.error === "No video directories configured" ? 500 : 403,
			});
		}

		// ファイルが存在するか確認
		if (!validation.exists) {
			return new NextResponse("File not found", { status: 404 });
		}

		// ファイルをストリームとして返す
		const stat = statSync(validation.fullPath);

		// Range requestsのサポート（動画の途中再生など）
		const range = req.headers.get("range");

		if (range) {
			const parts = range.replace(/bytes=/, "").split("-");
			const start = Number.parseInt(parts[0], 10);
			const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
			const chunksize = end - start + 1;

			const stream = createReadStream(validation.fullPath, { start, end });

			return new NextResponse(stream as unknown as ReadableStream, {
				status: 206,
				headers: {
					"Content-Range": `bytes ${start}-${end}/${stat.size}`,
					"Accept-Ranges": "bytes",
					"Content-Length": chunksize.toString(),
					"Content-Type": "video/mp4",
				},
			});
		}

		const fileStream = createReadStream(validation.fullPath);
		return new NextResponse(fileStream as unknown as ReadableStream, {
			headers: {
				"Content-Type": "video/mp4",
				"Content-Length": stat.size.toString(),
				"Accept-Ranges": "bytes",
			},
		});
	} catch (error) {
		console.error("Error serving video file:", error);
		return new NextResponse("Internal server error", { status: 500 });
	}
}
