import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface VideoChapter {
	id: number;
	title: string;
	startTime: number; // 秒単位
	endTime: number;
	duration: number;
}

interface FFProbeChapter {
	id: number;
	start_time: string;
	end_time: string;
	tags?: {
		title?: string;
	};
}

interface FFProbeOutput {
	chapters?: FFProbeChapter[];
}

/**
 * 動画ファイルからチャプター情報を抽出
 */
export async function extractVideoChapters(
	filePath: string,
): Promise<VideoChapter[]> {
	try {
		// ffprobeでチャプター情報をJSON形式で取得
		const command = `ffprobe -v quiet -print_format json -show_chapters "${filePath}"`;
		const { stdout } = await execAsync(command);

		if (!stdout.trim()) {
			return []; // チャプター情報なし
		}

		const ffprobeData: FFProbeOutput = JSON.parse(stdout);

		if (!ffprobeData.chapters || ffprobeData.chapters.length === 0) {
			return [];
		}

		// FFProbeの結果をVideoChapter形式に変換
		return ffprobeData.chapters.map((chapter) => {
			const startTime = Number.parseFloat(chapter.start_time);
			const endTime = Number.parseFloat(chapter.end_time);

			return {
				id: chapter.id,
				title: chapter.tags?.title || `Chapter ${chapter.id + 1}`,
				startTime,
				endTime,
				duration: endTime - startTime,
			};
		});
	} catch (error) {
		console.error("Failed to extract video chapters:", error);
		return [];
	}
}

/**
 * チャプター情報をWebVTT形式に変換（HTML5 video要素用）
 */
export function convertChaptersToWebVTT(chapters: VideoChapter[]): string {
	if (chapters.length === 0) return "";

	let vtt = "WEBVTT\n\n";

	chapters.forEach((chapter, index) => {
		const startTime = formatTimeForWebVTT(chapter.startTime);
		const endTime = formatTimeForWebVTT(chapter.endTime);

		vtt += `CHAPTER ${index + 1}\n`;
		vtt += `${startTime} --> ${endTime}\n`;
		vtt += `${chapter.title}\n\n`;
	});

	return vtt;
}

/**
 * 秒数をWebVTT時間形式 (HH:MM:SS.mmm) に変換
 */
function formatTimeForWebVTT(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
}
