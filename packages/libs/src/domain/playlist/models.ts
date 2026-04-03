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
	videos?: PlaylistVideo[];
}

export interface PlaylistVideo {
	id: string;
	filePath: string;
	fileName: string;
	title: string;
	duration: number | null;
	episode: number | null;
	year: number | null;
	thumbnailPath: string | null;
	addedAt: Date;
}
