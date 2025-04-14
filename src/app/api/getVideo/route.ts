import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const filePath = url.searchParams.get("filePath");

		if (!filePath) {
			return new NextResponse("File path is required", { status: 400 });
		}

		// ベースディレクトリを設定（サーバー上の動画ファイルが保存されているディレクトリ）
		const BASE_DIR = process.env.ORIGIN_PATH ?? "";

		// セキュリティ対策: リクエストされたパスを正規化し、ベースディレクトリ内に収まるか確認
		const resolvedPath = path.resolve(BASE_DIR, filePath);
		if (!resolvedPath.startsWith(BASE_DIR)) {
			return new NextResponse("Invalid file path", { status: 403 });
		}

		// ファイルが存在するか確認
		if (!fs.existsSync(resolvedPath)) {
			return new NextResponse("File not found", { status: 404 });
		}

		// ファイルをストリームとして返す
		const fileStream = fs.createReadStream(resolvedPath);
		const stat = fs.statSync(resolvedPath);

		return new NextResponse(fileStream, {
			headers: {
				"Content-Type": "video/mp4",
				"Content-Length": stat.size.toString(),
			},
		});
	} catch (error) {
		console.error("Error serving video file:", error);
		return new NextResponse("Internal server error", { status: 500 });
	}
}
