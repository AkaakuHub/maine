export interface ProgressData {
	filePath: string;
	watchTime?: number | null;
	watchProgress: number;
	isLiked: boolean;
	likedAt?: Date | null;
	lastWatched?: Date | null;
}

export interface UpdateProgressParams {
	filePath: string;
	watchTime?: number;
	watchProgress?: number;
	isLiked?: boolean;
}

export interface VideoProgressData {
	filePath: string;
	watchTime?: number;
	watchProgress?: number;
	isLiked?: boolean;
}
