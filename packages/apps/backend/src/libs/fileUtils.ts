import * as path from "node:path";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import * as crypto from "node:crypto";

/**
 * クロスプラットフォーム対応のファイルパス正規化
 */
export function normalizePath(filePath: string): string {
	// Windows環境ではバックスラッシュを維持し、path.normalizeのみ適用
	return path.normalize(filePath);
}

/**
 * ファイルパスから拡張子を取得
 */
function getFileExtension(filePath: string): string {
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
async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
}

/**
 * 相対パスを安全に処理（ディレクトリトラバーサル攻撃防止）
 */
function sanitizePath(userPath: string, basePath: string): string | null {
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
interface FilePathValidation {
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

/**
 * プレイリストデータの型定義
 */
export interface PlaylistData {
	id: string;
	name: string;
	path: string;
	description?: string;
	videoCount: number;
	totalDuration: number;
	createdAt: Date;
	updatedAt: Date;
	isActive: boolean;
}

/**
 * ファイルコンテンツからSHA256ハッシュを生成（大きなファイル対応）
 */
export async function generateFileContentHash(
	filePath: string,
): Promise<string> {
	try {
		const hash = crypto.createHash("sha256");
		const stream = createReadStream(filePath);

		return new Promise((resolve, reject) => {
			stream.on("data", (chunk) => {
				hash.update(chunk);
			});

			stream.on("end", () => {
				resolve(hash.digest("hex"));
			});

			stream.on("error", (error) => {
				reject(
					new Error(`Failed to generate hash for file ${filePath}: ${error}`),
				);
			});
		});
	} catch (error) {
		throw new Error(`Failed to generate hash for file ${filePath}: ${error}`);
	}
}

/**
 * プレイリスト検出クラス
 */
export class PlaylistDetector {
	/**
	 * VIDEO_DIRECTORYからプレイリストを検出
	 */
	async detectPlaylists(videoDirectories: string[]): Promise<PlaylistData[]> {
		const playlists = new Map<string, PlaylistData>();

		console.log(
			`Detecting playlists in directories: ${videoDirectories.join(", ")}`,
		);

		for (const baseDir of videoDirectories) {
			try {
				// ディレクトリの存在確認
				await fs.access(baseDir, fs.constants.R_OK);
				console.log(`Scanning base directory: ${baseDir}`);

				// 直接の子ディレクトリのみをスキャン
				const immediateSubdirs = await this.getImmediateSubdirectories(baseDir);
				console.log(
					`Found ${immediateSubdirs.length} immediate subdirectories: ${immediateSubdirs.join(", ")}`,
				);

				for (const subdir of immediateSubdirs) {
					const relativePath = path.relative(baseDir, subdir);
					const playlistName = path.basename(subdir);

					console.log(
						`Checking subdirectory: ${subdir} (relative: ${relativePath}, name: ${playlistName})`,
					);

					// このディレクトリに動画ファイルが含まれているか確認
					const hasVideos = await this.hasVideoFiles(subdir);
					console.log(`Has videos in ${playlistName}: ${hasVideos}`);

					if (hasVideos) {
						const playlistData: PlaylistData = {
							id: this.generatePlaylistId(relativePath),
							name: playlistName,
							path: relativePath,
							videoCount: 0,
							totalDuration: 0,
							createdAt: new Date(),
							updatedAt: new Date(),
							isActive: true,
						};
						playlists.set(relativePath, playlistData);
						console.log(
							`Created playlist: ${playlistName} (${playlistData.id}) with path: ${relativePath}`,
						);
					}
				}
			} catch (error) {
				console.warn(`Failed to scan directory ${baseDir}:`, error);
			}
		}

		const result = Array.from(playlists.values());
		console.log(`Total playlists detected: ${result.length}`);
		for (const p of result) {
			console.log(`  - ${p.name} (${p.path})`);
		}

		return result;
	}

	/**
	 * 直接の子ディレクトリのみを取得
	 */
	private async getImmediateSubdirectories(dir: string): Promise<string[]> {
		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });
			return entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(dir, entry.name))
				.filter((subdir) => !this.isHiddenDirectory(subdir));
		} catch (error) {
			console.warn(`Failed to read directory ${dir}:`, error);
			return [];
		}
	}

	/**
	 * 動画ファイルの存在確認（再帰的に検索）
	 */
	private async hasVideoFiles(dir: string): Promise<boolean> {
		try {
			const files = await this.getAllFilesRecursive(dir);
			return files.some((file) => isVideoFile(file));
		} catch (error) {
			console.warn(`Failed to check video files in ${dir}:`, error);
			return false;
		}
	}

	/**
	 * ディレクトリ内の全ファイルを再帰的に取得
	 */
	private async getAllFilesRecursive(
		dir: string,
		maxDepth = 10,
	): Promise<string[]> {
		const files: string[] = [];

		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isFile()) {
					files.push(fullPath);
				} else if (entry.isDirectory() && maxDepth > 0) {
					// 再帰的にサブディレクトリをスキャン
					const subFiles = await this.getAllFilesRecursive(
						fullPath,
						maxDepth - 1,
					);
					files.push(...subFiles);
				}
			}
		} catch (error) {
			console.warn(`Failed to read directory ${dir}:`, error);
		}

		return files;
	}

	/**
	 * 隠しディレクトリかチェック
	 */
	private isHiddenDirectory(dirPath: string): boolean {
		const dirName = path.basename(dirPath);
		return dirName.startsWith(".") || dirName.startsWith("_");
	}

	/**
	 * プレイリストIDを生成
	 */
	private generatePlaylistId(playlistPath: string): string {
		return crypto
			.createHash("sha256")
			.update(`playlist:${playlistPath}`)
			.digest("hex");
	}

	/**
	 * 動画ファイルからプレイリストを割り当て
	 */
	assignPlaylist(
		filePath: string,
		playlists: PlaylistData[],
	): PlaylistData | null {
		console.log(`Assigning playlist for: ${filePath}`);
		console.log(
			`Available playlists: ${playlists.map((p) => `${p.name}(${p.path})`).join(", ")}`,
		);

		for (const baseDir of getVideoDirectories()) {
			if (filePath.startsWith(baseDir)) {
				const relativePath = path.relative(baseDir, filePath);
				const pathParts = relativePath.split(path.sep);

				console.log(`Base directory: ${baseDir}`);
				console.log(`Relative path: ${relativePath}`);
				console.log(`Path parts: ${pathParts.join(" -> ")}`);

				// 最初の階層のみをプレイリストとして判断
				if (pathParts.length > 1) {
					const firstLevelDir = pathParts[0];
					const playlistPath = firstLevelDir;

					console.log(`Looking for playlist: ${playlistPath}`);

					const foundPlaylist = playlists.find((p) => p.path === playlistPath);
					if (foundPlaylist) {
						console.log(
							`Found playlist: ${foundPlaylist.name} (${foundPlaylist.id})`,
						);
					} else {
						console.log(`No playlist found for path: ${playlistPath}`);
					}

					return foundPlaylist || null;
				}
				console.log(
					`File is in root directory, no subdirectory: ${pathParts[0]}`,
				);
			}
		}
		console.log(`No matching base directory found for: ${filePath}`);
		return null;
	}
}
