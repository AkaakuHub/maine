export interface ChapterSkipRule {
	id: string;
	pattern: string;
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserSettings {
	chapterSkipEnabled: boolean;
	skipNotificationShow: boolean;
}
