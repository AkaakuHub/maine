// Prisma Video model types
export interface VideoData {
	id: string;
	title: string;
	fileName: string;
	filePath: string;
	duration?: number | null;
	fileSize: string; // BigInt serialized as string
	thumbnail?: string | null;
	episode?: number | null;
	season?: string | null;
	genre?: string | null;
	year?: number | null;
	rating?: number | null;
	lastWatched?: Date | null;
	watchTime?: number | null;
	watchProgress: number; // watch progress percentage (0-100)
	isLiked: boolean; // like status
	likedAt?: Date | null; // when it was liked
	createdAt: Date;
	updatedAt: Date;
}

export interface VideoResponse {
	videos: VideoData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Legacy types for backward compatibility - to be removed after migration
export interface VideoData extends VideoData {}
export interface VideoResponse {
	videos: VideoData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface DatabaseUpdateResponse {
	message: string;
	stats: {
		total: number;
		added: number;
		updated: number;
		deleted: number;
		scanned: number;
	};
}

// Legacy types for backward compatibility
export type DatabaseJsonType = {
	newDatabase: Record<string, string[]>;
};

export type VideoFile = {
	name: string;
	path: string;
	size?: number;
	duration?: number;
	thumbnail?: string;
};

export type VideoCollection = {
	title: string;
	episodes: VideoFile[];
	thumbnail?: string;
	description?: string;
};

export type VideoControlProps = {
	onPlayPause: React.MouseEventHandler<HTMLDivElement>;
	isPlaying: boolean;
	onRewind: () => void;
	onForward: () => void;
	played: number;
	onSeek: (e: Event, value: number | number[], activeThumb: number) => void;
	onSeekMouseUp: (
		e: Event | React.SyntheticEvent<Element, Event>,
		value: number | number[],
	) => void;
	volume: number;
	onVolumeChange: (
		e: Event,
		value: number | number[],
		activeThumb: number,
	) => void;
	onVolumeSeekUp: (
		e: Event | React.SyntheticEvent<Element, Event>,
		value: number | number[],
	) => void;
	isMuted: boolean;
	onMute: React.MouseEventHandler<HTMLDivElement>;
	duration: string;
	currentTime: string;
	controlRef: React.RefObject<HTMLDivElement>;
	onToggleFullscreen: React.MouseEventHandler<HTMLDivElement>;
	onTogglePictureInPicture: React.MouseEventHandler<HTMLDivElement>;
	onChangePlaybackRate: (rate: number) => void;
	isFullScreen: boolean;
};
