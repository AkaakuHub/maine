export interface VideoFileData {
	id: string;
	title: string;
	fileName: string;
	filePath: string;
	duration?: number;
	thumbnailPath?: string;
	fileSize: number;
	episode?: number;
	season?: string;
	genre?: string;
	year?: number;
	fileModifiedAt?: Date;
	playlistId?: string;
	playlistName?: string;
}

export interface VideoInfoType {
	title: string;
	episode: string;
	fullTitle: string;
	filePath: string;
	id: string;
	description?: string;
	genre?: string;
	year?: string;
	duration?: string;
	broadcastDate?: Date;
	broadcastStation?: string;
	dayOfWeek?: string;
	timeSlot?: string;
	weeklySchedule?: string;
}
