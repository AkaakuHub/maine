import path from "node:path";
import { promises as fs } from "node:fs";
import {
	normalizePath,
	isVideoFile,
	getFileName,
	getFileSize,
} from "@/libs/fileUtils";
import type { VideoData } from "@/type";

export interface VideoSearchFilters {
	search?: string;
	genre?: string;
	year?: string;
}

export interface VideoSearchSorting {
	sortBy: "title" | "year" | "episode" | "fileName";
	sortOrder: "asc" | "desc";
}

export interface VideoSearchPagination {
	page: number;
	limit: number;
}

export interface VideoSearchResult {
	videos: VideoData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export class RealtimeVideoService {
	/**
	 * リアルタイムで動画ファイルを検索
	 */
	static async searchVideos(
		filters: VideoSearchFilters = {},
		sorting: VideoSearchSorting = { sortBy: "title", sortOrder: "asc" },
		pagination: VideoSearchPagination = { page: 1, limit: 20 }
	): Promise<VideoSearchResult> {
		const videoDirectory = process.env.VIDEO_DIRECTORY;

		if (!videoDirectory) {
			throw new Error("VIDEO_DIRECTORY environment variable not set");
		}

		// ディレクトリの存在確認
		try {
			await fs.access(videoDirectory);
		} catch {
			throw new Error(`Video directory not found: ${videoDirectory}`);
		}

		console.log(`[RealtimeVideoService] Scanning directory: ${videoDirectory}`);
		console.log(`[RealtimeVideoService] Filters:`, filters);

		// ディレクトリをスキャンして動画ファイルを取得
		const allVideos = await this.scanDirectory(videoDirectory);
		console.log(`[RealtimeVideoService] Found ${allVideos.length} video files`);

		// フィルタリング
		let filteredVideos = allVideos;

		if (filters.search && filters.search.trim()) {
			const searchTerm = filters.search.trim().toLowerCase();
			filteredVideos = filteredVideos.filter(video => 
				video.title.toLowerCase().includes(searchTerm) ||
				video.fileName.toLowerCase().includes(searchTerm)
			);
			console.log(`[RealtimeVideoService] After search filter: ${filteredVideos.length} videos`);
		}

		if (filters.genre) {
			filteredVideos = filteredVideos.filter(video => 
				video.genre?.toLowerCase().includes(filters.genre!.toLowerCase())
			);
		}

		if (filters.year) {
			const year = parseInt(filters.year, 10);
			if (!isNaN(year)) {
				filteredVideos = filteredVideos.filter(video => video.year === year);
			}
		}

		// ソート
		filteredVideos.sort((a, b) => {
			let aValue: any;
			let bValue: any;

			switch (sorting.sortBy) {
				case "title":
					aValue = a.title.toLowerCase();
					bValue = b.title.toLowerCase();
					break;
				case "year":
					aValue = a.year || 0;
					bValue = b.year || 0;
					break;
				case "episode":
					aValue = a.episode || 0;
					bValue = b.episode || 0;
					break;
				case "fileName":
					aValue = a.fileName.toLowerCase();
					bValue = b.fileName.toLowerCase();
					break;
				default:
					aValue = a.title.toLowerCase();
					bValue = b.title.toLowerCase();
			}

			if (aValue < bValue) return sorting.sortOrder === "asc" ? -1 : 1;
			if (aValue > bValue) return sorting.sortOrder === "asc" ? 1 : -1;
			return 0;
		});

		// ページネーション
		const total = filteredVideos.length;
		const totalPages = Math.ceil(total / pagination.limit);
		const startIndex = (pagination.page - 1) * pagination.limit;
		const endIndex = startIndex + pagination.limit;
		const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

		console.log(`[RealtimeVideoService] Returning ${paginatedVideos.length} videos (page ${pagination.page}/${totalPages})`);

		return {
			videos: paginatedVideos,
			pagination: {
				page: pagination.page,
				limit: pagination.limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * 指定されたディレクトリから動画ファイルを再帰的にスキャン
	 */
	private static async scanDirectory(dirPath: string): Promise<VideoData[]> {
		const videos: VideoData[] = [];

		try {
			const items = await fs.readdir(dirPath, { withFileTypes: true });

			for (const item of items) {
				const fullPath = path.join(dirPath, item.name);

				if (item.isDirectory()) {
					const subVideos = await this.scanDirectory(fullPath);
					videos.push(...subVideos);
				} else if (item.isFile() && isVideoFile(item.name)) {
					try {
						const videoInfo = await this.extractVideoInfo(fullPath);
						videos.push(videoInfo);
					} catch (error) {
						console.warn(`Failed to process file ${fullPath}:`, error);
					}
				}
			}
		} catch (error) {
			console.error(`Failed to scan directory ${dirPath}:`, error);
			// ディレクトリスキャンエラーでも続行
		}

		return videos;
	}

	/**
	 * 動画ファイルから情報を抽出
	 */
	private static async extractVideoInfo(fullPath: string): Promise<VideoData> {
		const fileSize = await getFileSize(fullPath);
		const normalizedPath = normalizePath(fullPath);
		const fileName = getFileName(fullPath);

		// ファイル名から情報を抽出
		const title = this.extractTitle(fileName);
		const episode = this.extractEpisode(fileName);
		const year = this.extractYear(fileName);
		return {
			id: normalizedPath, // ファイルパスをIDとして使用
			title,
			fileName,
			filePath: normalizedPath,
			fileSize: fileSize.toString(),
			episode,
			year,
			// デフォルト値
			duration: undefined,
			thumbnail: undefined,
			season: undefined,
			genre: undefined,
			rating: undefined,
			lastWatched: undefined,
			watchTime: undefined,
			watchProgress: 0,
			isLiked: false,
			likedAt: undefined,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	/**
	 * ファイル名からタイトルを抽出
	 */
	private static extractTitle(fileName: string): string {
		// ファイル拡張子を除去
		const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
		
		// 括弧内の情報や品質情報を除去
		const cleanTitle = nameWithoutExt
			.replace(/\[.*?\]/g, '') // [xxx] を除去
			.replace(/\(.*?\)/g, '') // (xxx) を除去
			.replace(/\d{3,4}p/gi, '') // 720p, 1080p などを除去
			.replace(/\b(x264|x265|h264|h265|hevc|avc)\b/gi, '') // エンコード情報を除去
			.replace(/\b(BluRay|BDRip|DVDRip|WEBRip|HDTV)\b/gi, '') // ソース情報を除去
			.replace(/\s+/g, ' ') // 複数のスペースを1つに
			.trim();

		return cleanTitle || fileName;
	}

	/**
	 * ファイル名からエピソード番号を抽出
	 */
	private static extractEpisode(fileName: string): number | undefined {
		const episodePatterns = [
			/(?:ep?|episode|第)[\s]*(\d+)/i,
			/\b(\d{1,2})\s*話/,
			/\s(\d{1,2})\s/,
			/[-_](\d{1,2})[-_]/,
		];

		for (const pattern of episodePatterns) {
			const match = fileName.match(pattern);
			if (match) {
				const episode = parseInt(match[1], 10);
				if (episode > 0 && episode < 1000) { // 妥当な範囲のエピソード番号
					return episode;
				}
			}
		}

		return undefined;
	}

	/**
	 * ファイル名から年を抽出
	 */
	private static extractYear(fileName: string): number | undefined {
		const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
		if (yearMatch) {
			const year = parseInt(yearMatch[0], 10);
			const currentYear = new Date().getFullYear();
			if (year >= 1950 && year <= currentYear + 1) { // 妥当な範囲の年
				return year;
			}
		}
		return undefined;
	}
}
