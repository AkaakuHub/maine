import { settingsPrisma } from "@/libs/settingsPrisma";

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

// チャプタースキップルール管理
export async function getChapterSkipRules(): Promise<ChapterSkipRule[]> {
	return await settingsPrisma.chapterSkipRule.findMany({
		orderBy: { createdAt: "asc" },
	});
}

export async function getEnabledChapterSkipRules(): Promise<ChapterSkipRule[]> {
	return await settingsPrisma.chapterSkipRule.findMany({
		where: { enabled: true },
		orderBy: { createdAt: "asc" },
	});
}

export async function createChapterSkipRule(
	pattern: string,
	enabled = true,
): Promise<ChapterSkipRule> {
	const trimmedPattern = pattern.trim();

	if (!trimmedPattern) {
		throw new Error("Pattern cannot be empty");
	}

	// 重複チェック
	const existingRule = await settingsPrisma.chapterSkipRule.findFirst({
		where: { pattern: trimmedPattern },
	});

	if (existingRule) {
		throw new Error("Pattern already exists");
	}

	return await settingsPrisma.chapterSkipRule.create({
		data: {
			pattern: trimmedPattern,
			enabled,
		},
	});
}

export async function updateChapterSkipRule(
	id: string,
	updates: { pattern?: string; enabled?: boolean },
): Promise<ChapterSkipRule> {
	const updateData: { pattern?: string; enabled?: boolean; updatedAt: Date } = {
		updatedAt: new Date(),
	};

	if (updates.pattern !== undefined) {
		const trimmedPattern = updates.pattern.trim();
		if (!trimmedPattern) {
			throw new Error("Pattern cannot be empty");
		}

		// 他のルールとの重複チェック
		const existingRule = await settingsPrisma.chapterSkipRule.findFirst({
			where: { pattern: trimmedPattern, NOT: { id } },
		});

		if (existingRule) {
			throw new Error("Pattern already exists");
		}

		updateData.pattern = trimmedPattern;
	}

	if (updates.enabled !== undefined) {
		updateData.enabled = updates.enabled;
	}

	return await settingsPrisma.chapterSkipRule.update({
		where: { id },
		data: updateData,
	});
}

export async function deleteChapterSkipRule(id: string): Promise<void> {
	await settingsPrisma.chapterSkipRule.delete({
		where: { id },
	});
}

// チャプターがスキップ対象かどうかを判定
export async function shouldSkipChapter(
	chapterTitle: string,
	enabledRules?: ChapterSkipRule[],
): Promise<boolean> {
	const rules = enabledRules || (await getEnabledChapterSkipRules());

	if (rules.length === 0) return false;

	const normalizedTitle = chapterTitle.toLowerCase();

	return rules.some((rule) =>
		normalizedTitle.includes(rule.pattern.toLowerCase()),
	);
}

// ユーザー設定管理
export async function getUserSettings(): Promise<UserSettings> {
	try {
		const settings = await settingsPrisma.userSettings.findUnique({
			where: { id: "user_settings" },
		});

		return {
			chapterSkipEnabled: settings?.chapterSkipEnabled ?? true,
			skipNotificationShow: settings?.skipNotificationShow ?? true,
		};
	} catch (_error) {
		// 設定が存在しない場合はデフォルト値を返す
		return {
			chapterSkipEnabled: true,
			skipNotificationShow: true,
		};
	}
}

export async function updateUserSettings(
	updates: Partial<UserSettings>,
): Promise<UserSettings> {
	const result = await settingsPrisma.userSettings.upsert({
		where: { id: "user_settings" },
		update: {
			...updates,
			updatedAt: new Date(),
		},
		create: {
			id: "user_settings",
			chapterSkipEnabled: updates.chapterSkipEnabled ?? true,
			skipNotificationShow: updates.skipNotificationShow ?? true,
		},
	});

	return {
		chapterSkipEnabled: result.chapterSkipEnabled,
		skipNotificationShow: result.skipNotificationShow,
	};
}
