"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { VideoFileData } from "@/type";
import { createApiUrl } from "@/utils/api";

export interface CachedVideo {
	id: string;
	filePath: string;
	title: string;
	blob: Blob;
	downloadedAt: Date;
	size: number;
	duration?: number;
	thumbnail?: string;
}

export interface DownloadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

const DB_NAME = "MyVideoStorage";
const DB_VERSION = 2; // ID生成方式変更のためバージョンアップ
const STORE_NAME = "cachedVideos";

class OfflineStorageService {
	private db: IDBPDatabase | null = null;

	async init(): Promise<void> {
		if (this.db) return;
		this.db = await openDB(DB_NAME, DB_VERSION, {
			upgrade(db: IDBPDatabase, oldVersion) {
				// ストアが存在する場合は削除して再作成（ID方式変更のため）
				if (oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
					db.deleteObjectStore(STORE_NAME);
					console.log(
						"OfflineStorage: 古いストアを削除しました（ID方式変更のため）",
					);
				}

				const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
				store.createIndex("filePath", "filePath", { unique: true });
				store.createIndex("downloadedAt", "downloadedAt");
				console.log("OfflineStorage: 新しいストアを作成しました");
			},
		});
	}

	async downloadAndCache(
		filePath: string,
		title: string,
		onProgress?: (progress: DownloadProgress) => void,
		abortSignal?: AbortSignal,
	): Promise<void> {
		await this.init();
		if (!this.db) throw new Error("Database not initialized");

		// 既にキャッシュされているかチェック
		const existing = await this.getCachedVideo(filePath);
		if (existing) {
			throw new Error("この動画は既にキャッシュされています");
		}

		try {
			const response = await fetch(
				createApiUrl(`/video/${encodeURIComponent(filePath)}`),
				{
					signal: abortSignal,
				},
			);

			if (!response.ok) {
				throw new Error(
					`動画のダウンロードに失敗しました: ${response.statusText}`,
				);
			}

			const contentLength = response.headers.get("Content-Length");
			const total = contentLength ? Number.parseInt(contentLength, 10) : 0;

			if (!response.body) {
				throw new Error("レスポンスボディが見つかりません");
			}

			const reader = response.body.getReader();
			const chunks: BlobPart[] = [];
			let loaded = 0;

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				if (abortSignal?.aborted) {
					throw new Error("ダウンロードがキャンセルされました");
				}

				chunks.push(value);
				loaded += value.length;

				if (onProgress && total) {
					const percentage = Math.round((loaded / total) * 100);
					onProgress({ loaded, total, percentage });
				}
			}

			// Blobを作成
			const blob = new Blob(chunks, { type: "video/mp4" });

			// IndexedDBに保存
			const cachedVideo: CachedVideo = {
				id: this.generateId(filePath),
				filePath,
				title,
				blob,
				downloadedAt: new Date(),
				size: blob.size,
			};

			await this.db.put(STORE_NAME, cachedVideo);
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				throw new Error("ダウンロードがキャンセルされました");
			}
			throw error;
		}
	}

	async getCachedVideo(filePath: string): Promise<CachedVideo | null> {
		await this.init();
		if (!this.db) return null;

		const id = this.generateId(filePath);
		console.log(
			"getCachedVideo: searching for ID:",
			id,
			"from filePath:",
			filePath,
		);

		const result = (await this.db.get(STORE_NAME, id)) || null;
		console.log("getCachedVideo: found result:", result ? "YES" : "NO");

		return result;
	}

	async getAllCachedVideos(): Promise<CachedVideo[]> {
		await this.init();
		if (!this.db) return [];

		const allVideos = await this.db.getAll(STORE_NAME);
		return allVideos;
	}

	async deleteCachedVideo(filePath: string): Promise<void> {
		await this.init();
		if (!this.db) return;

		const id = this.generateId(filePath);
		await this.db.delete(STORE_NAME, id);
	}

	async clearAllCache(): Promise<void> {
		await this.init();
		if (!this.db) return;

		await this.db.clear(STORE_NAME);
	}

	async getCacheSize(): Promise<number> {
		const videos = await this.getAllCachedVideos();
		return videos.reduce((total, video) => total + video.size, 0);
	}

	async isCached(filePath: string): Promise<boolean> {
		const cached = await this.getCachedVideo(filePath);
		return cached !== null;
	}

	createObjectURL(blob: Blob): string {
		return URL.createObjectURL(blob);
	}

	revokeObjectURL(url: string): void {
		URL.revokeObjectURL(url);
	}

	private generateId(filePath: string): string {
		// ファイルパスをそのままBase64エンコードして、特殊文字を除去せずに使用
		// これによりデコード時に元のパスを正確に復元できる
		const encoded = btoa(encodeURIComponent(filePath));
		console.log("generateId: filePath =", filePath, "=> id =", encoded);
		return encoded;
	}

	// ストレージ使用量をチェック
	async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
		if ("storage" in navigator && "estimate" in navigator.storage) {
			const estimate = await navigator.storage.estimate();
			return {
				usage: estimate.usage || 0,
				quota: estimate.quota || 0,
			};
		}
		return null;
	}
}

export const offlineStorageService = new OfflineStorageService();

// APIクライアント用のヘルパー関数
export const getOfflineVideos = async (): Promise<VideoFileData[]> => {
	const cachedVideos = await offlineStorageService.getAllCachedVideos();

	return cachedVideos.map((cached) => ({
		id: cached.id,
		filePath: cached.filePath,
		fileName: cached.title,
		title: cached.title,
		fileSize: cached.size,
		watchProgress: 0, // IndexedDBから取得する必要があれば実装
		watchTime: 0,
		isLiked: false,
		isInWatchlist: false,
		videoId: cached.id, // 一時的にcached.idを使用（本来はvideoIdを保存すべき）
		createdAt: cached.downloadedAt.toISOString(),
		episode: undefined,
		year: undefined,
	}));
};

export const getOfflineVideoBlob = async (filePath: string): Promise<Blob> => {
	const cached = await offlineStorageService.getCachedVideo(filePath);
	if (!cached) {
		throw new Error(`オフライン動画が見つかりません: ${filePath}`);
	}
	return cached.blob;
};

// プログレス管理用のストレージ
const PROGRESS_STORE = "videoProgress";

// プログレス保存
export const saveOfflineProgress = async (
	filePath: string,
	progress: number,
): Promise<void> => {
	const db = await openDB("VideoProgress", 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
				db.createObjectStore(PROGRESS_STORE, { keyPath: "filePath" });
			}
		},
	});

	await db.put(PROGRESS_STORE, {
		filePath,
		progress,
		updatedAt: new Date(),
	});
};

// プログレス取得
export const getOfflineProgress = async (filePath: string): Promise<number> => {
	try {
		const db = await openDB("VideoProgress", 1);
		const result = await db.get(PROGRESS_STORE, filePath);
		return result?.progress || 0;
	} catch {
		return 0;
	}
};
