import path from "node:path";
import { promises as fs } from "node:fs";
import { prisma } from "@/libs/prisma";
import {
	normalizePath,
	isVideoFile,
	getFileName,
	getFileSize,
} from "@/libs/fileUtils";
import type { VideoFileData } from "@/type";

export interface VideoFileInfo {
	id: string;
	title: string;
	fileName: string;
	filePath: string;
	duration?: number;
	fileSize: number;
	episode?: number;
	season?: string;
	genre?: string;
	year?: number;
}

export interface SearchResult {
	success: boolean;
	videos: VideoFileData[];
	totalFound: number;
	message: string;
	error?: string;
}

/**
 * 指定されたディレクトリから動画ファイルを再帰的にスキャン
 */
async function scanDirectory(dirPath: string): Promise<VideoFileInfo[]> {
	const videos: VideoFileInfo[] = [];

	try {
		const items = await fs.readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dirPath, item.name);

			if (item.isDirectory()) {
				const subVideos = await scanDirectory(fullPath);
				videos.push(...subVideos);
			} else if (item.isFile() && isVideoFile(item.name)) {
				try {
					const videoInfo = await extractVideoInfo(fullPath);
					videos.push(videoInfo);
				} catch (error) {
					console.warn(`Failed to process file ${fullPath}:`, error);
				}
			}
		}
	} catch (error) {
		console.error(`Failed to scan directory ${dirPath}:`, error);
		throw new Error(`Directory scan failed: ${error}`);
	}

	return videos;
}

/**
 * 動画ファイルから情報を抽出
 */
async function extractVideoInfo(fullPath: string): Promise<VideoFileInfo> {
	const fileSize = await getFileSize(fullPath);
	const normalizedPath = normalizePath(fullPath);
	const fileName = getFileName(fullPath);

	// ファイル名から情報を抽出
	const title = extractTitle(fileName);
	const episode = extractEpisode(fileName);
	const year = extractYear(fileName);

	return {
		id: normalizedPath, // ファイルパスをIDとして使用
		title,
		fileName,
		filePath: normalizedPath,
		fileSize,
		episode,
		year,
	};
}

/**
 * ファイル名からタイトルを抽出
 */
function extractTitle(fileName: string): string {
	const titleMatch = fileName.match(/^(.+?)(?:\s*[\[\(].*[\]\)])?(?:\.\w+)?$/);
	return titleMatch ? titleMatch[1].trim() : fileName;
}

/**
 * ファイル名からエピソード番号を抽出
 */
function extractEpisode(fileName: string): number | undefined {
	const episodeMatch = fileName.match(/(?:ep?|episode|第)[\s]*(\d+)/i);
	return episodeMatch ? Number.parseInt(episodeMatch[1], 10) : undefined;
}

/**
 * ファイル名から年を抽出
 */
function extractYear(fileName: string): number | undefined {
	const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
	return yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined;
}

/**
 * データベースから再生進捗情報を取得してマージ
 */
async function mergeWithProgressData(
	videos: VideoFileInfo[],
): Promise<VideoFileData[]> {
	const allProgress = await prisma.videoProgress.findMany();
	const progressMap = new Map(allProgress.map((p) => [p.filePath, p]));

	return videos.map((video) => ({
		id: video.id,
		title: video.title,
		fileName: video.fileName,
		filePath: video.filePath,
		duration: video.duration,
		fileSize: video.fileSize,
		episode: video.episode,
		season: video.season,
		genre: video.genre,
		year: video.year,
		// 再生進捗情報をマージ
		watchProgress: progressMap.get(video.filePath)?.watchProgress || 0,
		watchTime: progressMap.get(video.filePath)?.watchTime || 0,
		isLiked: progressMap.get(video.filePath)?.isLiked || false,
		lastWatched: progressMap.get(video.filePath)?.lastWatched || null,
	}));
}

/**
 * 動画ファイルを検索（リアルタイムスキャン）
 */
async function searchVideos(searchQuery = ""): Promise<SearchResult> {
	try {
		const videoDirectory = process.env.VIDEO_DIRECTORY;

		if (!videoDirectory) {
			return {
				success: false,
				videos: [],
				totalFound: 0,
				message: "VIDEO_DIRECTORY environment variable not set",
				error: "Configuration error",
			};
		}

		// ディレクトリの存在確認
		try {
			await fs.access(videoDirectory);
		} catch {
			return {
				success: false,
				videos: [],
				totalFound: 0,
				message: `Video directory not found: ${videoDirectory}`,
				error: "Directory not found",
			};
		}

		console.log("Scanning directory:", videoDirectory);
		const videoFiles = await scanDirectory(videoDirectory);

		// 検索フィルタリング
		let filteredVideos = videoFiles;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredVideos = videoFiles.filter(
				(video) =>
					video.title.toLowerCase().includes(query) ||
					video.fileName.toLowerCase().includes(query),
			);
		}

		// データベースの再生進捗情報とマージ
		const videosWithProgress = await mergeWithProgressData(filteredVideos);

		return {
			success: true,
			videos: videosWithProgress,
			totalFound: videosWithProgress.length,
			message: `Found ${videosWithProgress.length} video(s)`,
		};
	} catch (error) {
		console.error("Video search error:", error);
		return {
			success: false,
			videos: [],
			totalFound: 0,
			message: "Failed to search videos",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export const VideoScanService = {
	searchVideos,
	scanDirectory,
	extractVideoInfo,
};
