import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Injectable, Logger } from "@nestjs/common";
import iconv from "iconv-lite";

@Injectable()
export class ProgramInfoService {
	private readonly logger = new Logger(ProgramInfoService.name);

	async getProgramInfo(filePath: string): Promise<{
		success: boolean;
		programInfo: string | null;
		filePath?: string;
		message?: string;
		error?: string;
	}> {
		try {
			if (!filePath) {
				return {
					success: false,
					programInfo: null,
					error: "ファイルパスが指定されていません",
				};
			}

			// 動画ファイルパスから番組情報テキストファイルのパスを生成
			const programInfoPath = this.generateTsProgramPath(filePath);
			const infoJsonPath = this.generateInfoJsonPath(filePath);

			// まず.ts.program.txt: shift_jis(iconv-liteでデコード
			// 次に.info.json: utf-8

			if (programInfoPath && existsSync(programInfoPath)) {
				let programInfo: string;
				// .ts.program.txt ファイルが存在する場合
				const buffer = await readFile(programInfoPath);
				try {
					programInfo = iconv.decode(buffer, "shift_jis");
				} catch {
					return {
						success: false,
						programInfo: null,
						error: "番組情報ファイルのデコードに失敗しました",
					};
				}

				return {
					success: true,
					programInfo: programInfo.trim(),
					filePath: programInfoPath,
				};
			}

			// youtubeのinfo.json形式
			if (infoJsonPath && existsSync(infoJsonPath)) {
				let programInfo: string;
				// .info.json ファイルが存在する場合
				const buffer = await readFile(infoJsonPath);
				try {
					const bufferString = buffer.toString("utf-8");
					const infoJson = JSON.parse(bufferString);
					programInfo = infoJson.description || "";
				} catch {
					return {
						success: false,
						programInfo: null,
						error: "番組情報ファイルのデコードに失敗しました",
					};
				}

				return {
					success: true,
					programInfo: programInfo.trim(),
					filePath: infoJsonPath,
				};
			}
			return {
				success: false,
				programInfo: null,
				message: "番組情報ファイルが見つかりません",
			};
		} catch (error) {
			this.logger.error("番組情報の取得エラー:", error);
			return {
				success: false,
				programInfo: null,
				error: "番組情報の取得に失敗しました",
			};
		}
	}

	private generateTsProgramPath(videoFilePath: string): string | null {
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
			this.logger.error("番組情報パスの生成エラー:", error);
			return null;
		}
	}

	private generateInfoJsonPath(videoFilePath: string): string | null {
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

			// .info.json ファイルのパスを生成
			// 例: video.mp4 -> video.info.json
			// 例: video.ts -> video.ts.info.json
			const infoJsonPath = `${baseName}.info.json`;

			return infoJsonPath;
		} catch (error) {
			this.logger.error("番組情報パスの生成エラー:", error);
			return null;
		}
	}
}
