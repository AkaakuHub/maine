export interface VideoInfoType {
	title: string;
	episode: string;
	fullTitle: string;
	filePath: string;
	description?: string;
	genre?: string;
	year?: string;
	duration?: string;
	// 番組情報
	broadcastDate?: Date;
	broadcastStation?: string;
	dayOfWeek?: string;
	timeSlot?: string;
	weeklySchedule?: string;
}
