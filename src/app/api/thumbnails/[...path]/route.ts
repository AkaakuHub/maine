import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * サムネイル画像配信API
 * GET /api/thumbnails/[...path]
 *
 * WebP形式のサムネイル画像を配信します
 */
export async function GET({ params }: { params: { path: string[] } }) {
	try {
		const thumbnailPath = params.path.join("/");

		// セキュリティ: パストラバーサル攻撃を防ぐ
		if (thumbnailPath.includes("..") || thumbnailPath.includes("~")) {
			return NextResponse.json({ error: "Invalid path" }, { status: 400 });
		}

		// サムネイルファイルの絶対パス
		const fullThumbnailPath = join(
			process.cwd(),
			"public",
			"thumbnails",
			thumbnailPath,
		);

		// ファイル存在チェック
		if (!existsSync(fullThumbnailPath)) {
			return NextResponse.json(
				{ error: "Thumbnail not found" },
				{ status: 404 },
			);
		}

		// WebPファイルかチェック
		if (!fullThumbnailPath.toLowerCase().endsWith(".webp")) {
			return NextResponse.json(
				{ error: "Only WebP thumbnails are supported" },
				{ status: 400 },
			);
		}

		// ファイル読み取り
		const fileBuffer = await readFile(fullThumbnailPath);

		// WebP画像として配信
		return new Response(new Uint8Array(fileBuffer), {
			status: 200,
			headers: {
				"Content-Type": "image/webp",
				"Cache-Control": "public, max-age=86400, immutable", // 24時間キャッシュ
				"Content-Length": fileBuffer.length.toString(),
			},
		});
	} catch (error) {
		console.error("Thumbnail serving error:", error);

		return NextResponse.json(
			{
				error: "Failed to serve thumbnail",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
