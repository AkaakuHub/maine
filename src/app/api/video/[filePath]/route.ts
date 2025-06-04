import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { statSync, createReadStream } from "node:fs";
import { findFileInVideoDirectories } from "@/libs/fileUtils";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ filePath: string }> },
) {
	try {
		const { filePath } = await params;
		const decodedPath = decodeURIComponent(filePath);

		// ダウンロードモードかどうかを確認
		const isDownload = request.nextUrl.searchParams.get("download") === "true";
		console.log("API called with download mode:", isDownload);
		console.log("File path:", decodedPath);

		// 複数のビデオディレクトリからファイルを検索
		const fileValidation = await findFileInVideoDirectories(decodedPath);

		if (!fileValidation.isValid || !fileValidation.exists) {
			console.error("File not found or invalid:", {
				filePath: decodedPath,
				error: fileValidation.error,
			});
			return new NextResponse(fileValidation.error || "File not found", {
				status:
					fileValidation.error === "No video directories configured"
						? 500
						: 404,
			});
		}

		const fullPath = fileValidation.fullPath;

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

			// ダウンロードモードの場合はContent-Dispositionヘッダーを追加
			if (isDownload) {
				const fileName = decodedPath.split(/[/\\]/).pop() || "video.mp4";
				// RFC 5987に準拠したファイル名エンコード（新しいブラウザ用）
				const encodedFileName = encodeURIComponent(fileName);
				// ASCII文字のみの場合はシンプルな形式も併記（古いブラウザ用）
				const containsNonAscii = fileName
					.split("")
					.some((char) => char.charCodeAt(0) > 127);
				const dispositionValue = containsNonAscii
					? `attachment; filename="video.mp4"; filename*=UTF-8''${encodedFileName}`
					: `attachment; filename="${fileName}"`;
				headers.set("Content-Disposition", dispositionValue);
			}

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
		}); // ダウンロードモードの場合はContent-Dispositionヘッダーを追加
		if (isDownload) {
			const fileName = decodedPath.split(/[/\\]/).pop() || "video.mp4";
			// RFC 5987に準拠したファイル名エンコード（新しいブラウザ用）
			const encodedFileName = encodeURIComponent(fileName);
			// ASCII文字のみの場合はシンプルな形式も併記（古いブラウザ用）
			const containsNonAscii = fileName
				.split("")
				.some((char) => char.charCodeAt(0) > 127);
			const dispositionValue = containsNonAscii
				? `attachment; filename="video.mp4"; filename*=UTF-8''${encodedFileName}`
				: `attachment; filename="${fileName}"`;
			headers.set("Content-Disposition", dispositionValue);
		}

		return new NextResponse(file as unknown as ReadableStream, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Video streaming error:", error);
		return new NextResponse("Internal server error", { status: 500 });
	}
}
