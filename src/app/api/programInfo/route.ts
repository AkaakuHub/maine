import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import iconv from "iconv-lite";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const filePath = searchParams.get("filePath");

		if (!filePath) {
			return NextResponse.json(
				{ error: "ファイルパスが指定されていません" },
				{ status: 400 },
			);
		}

		// 動画ファイルパスから番組情報テキストファイルのパスを生成
		const programInfoPath = generateProgramInfoPath(filePath);

		if (!programInfoPath || !existsSync(programInfoPath)) {
			return NextResponse.json({
				success: false,
				programInfo: null,
				message: "番組情報ファイルが見つかりません",
			});
		}

		// テキストファイルを読み込み
		// 元がShift_JISのため、めんどくさいがiconv-liteを使用
		let programInfo = "";
		const buffer = await readFile(programInfoPath);
		try {
			programInfo = iconv.decode(buffer, "shift_jis");
		} catch {
			return NextResponse.json(
				{ error: "番組情報ファイルのデコードに失敗しました" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			programInfo: programInfo.trim(),
			filePath: programInfoPath,
		});
	} catch (error) {
		console.error("番組情報の取得エラー:", error);
		return NextResponse.json(
			{ error: "番組情報の取得に失敗しました" },
			{ status: 500 },
		);
	}
}

function generateProgramInfoPath(videoFilePath: string): string | null {
	try {
		// 動画ファイルの拡張子を取得
		const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".ts", ".m2ts"];
		let foundExtension = "";

		for (const ext of videoExtensions) {
			if (videoFilePath.toLowerCase().endsWith(ext)) {
				foundExtension = ext;
				break;
			}
		}

		if (!foundExtension) {
			return null;
		}

		// 拡張子を除いたベース名を取得
		const baseName = videoFilePath.slice(0, -foundExtension.length);

		// .ts.program.txt ファイルのパスを生成
		// 例: video.mp4 -> video.ts.program.txt
		// 例: video.ts -> video.ts.program.txt
		const programInfoPath = `${baseName}.ts.program.txt`;

		return programInfoPath;
	} catch (error) {
		console.error("番組情報パスの生成エラー:", error);
		return null;
	}
}
