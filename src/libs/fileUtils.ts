import path from "node:path";
import { promises as fs } from "node:fs";

/**
 * クロスプラットフォーム対応のファイルパス正規化
 */
export function normalizePath(filePath: string): string {
	return path.normalize(filePath).replace(/\\/g, "/");
}

/**
 * ファイルパスからファイル名を取得
 */
export function getFileName(filePath: string): string {
	return path.basename(filePath);
}

/**
 * ファイルパスから拡張子を取得
 */
export function getFileExtension(filePath: string): string {
	return path.extname(filePath).toLowerCase();
}

/**
 * 動画ファイルの拡張子かチェック
 */
export function isVideoFile(filePath: string): boolean {
	const videoExtensions = [
		".mp4",
		".mkv",
		".avi",
		".mov",
		".wmv",
		".flv",
		".webm",
		".m4v",
	];
	return videoExtensions.includes(getFileExtension(filePath));
}

/**
 * ディレクトリの存在確認
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(dirPath);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

/**
 * ファイルの存在確認
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
}

/**
 * ファイルサイズを取得
 */
export async function getFileSize(filePath: string): Promise<number> {
	try {
		const stats = await fs.stat(filePath);
		return stats.size;
	} catch {
		return 0;
	}
}

/**
 * 相対パスを安全に処理（ディレクトリトラバーサル攻撃防止）
 */
export function sanitizePath(
	userPath: string,
	basePath: string,
): string | null {
	const resolvedPath = path.resolve(basePath, userPath);
	const normalizedBasePath = path.resolve(basePath);

	// ベースパス外へのアクセスを防ぐ
	if (!resolvedPath.startsWith(normalizedBasePath)) {
		return null;
	}

	return resolvedPath;
}

/**
 * セキュアなファイルパス検証結果の型
 */
export interface FilePathValidation {
	isValid: boolean;
	fullPath: string;
	exists: boolean;
	error?: string;
}

/**
 * 環境変数からビデオディレクトリのリストを取得
 */
export function getVideoDirectories(): string[] {
	const videoDirectories = process.env.VIDEO_DIRECTORY || "";

	if (!videoDirectories) {
		return [];
	}

	// カンマ区切りで分割し、空白をトリム
	// 引用符も削除する（Windowsパス対応）
	return videoDirectories
		.split(",")
		.map((dir) => dir.trim().replace(/^["']|["']$/g, "")) // 先頭と末尾の引用符を削除
		.filter((dir) => dir.length > 0);
}

/**
 * 複数のビデオディレクトリから指定されたファイルパスを検索
 */
export async function findFileInVideoDirectories(
	filePath: string,
): Promise<FilePathValidation> {
	const videoDirectories = getVideoDirectories();

	if (videoDirectories.length === 0) {
		return {
			isValid: false,
			fullPath: "",
			exists: false,
			error: "No video directories configured",
		};
	}

	// 各ディレクトリでファイルを検索
	for (const videoDirectory of videoDirectories) {
		// セキュリティチェック: パストラバーサル攻撃を防ぐ
		const fullPath = sanitizePath(filePath, videoDirectory);

		if (!fullPath) {
			continue; // 無効なパスはスキップ
		}

		// ファイルの存在確認
		const exists = await fileExists(fullPath);

		if (exists) {
			return {
				isValid: true,
				fullPath,
				exists: true,
			};
		}
	}

	return {
		isValid: false,
		fullPath: "",
		exists: false,
		error: "File not found in any configured video directory",
	};
}
