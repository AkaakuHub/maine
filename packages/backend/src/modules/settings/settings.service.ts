import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../../shared/prisma/generated/settings';

const globalForSettingsPrisma = globalThis as unknown as {
	settingsPrisma: PrismaClient | undefined;
};

@Injectable()
export class SettingsService {
	private readonly logger = new Logger(SettingsService.name);
	private readonly prisma: PrismaClient;

	constructor() {
		this.prisma =
			globalForSettingsPrisma.settingsPrisma ?? new PrismaClient();
		if (process.env.NODE_ENV !== 'production') {
			globalForSettingsPrisma.settingsPrisma = this.prisma;
		}
	}

	// チャプタースキップルール関連
	async getChapterSkipRules() {
		try {
			const rules = await this.prisma.chapterSkipRule.findMany({
				orderBy: { createdAt: 'asc' },
			});
			return { success: true, rules };
		} catch (error) {
			this.logger.error('Failed to fetch chapter skip rules', error);
			return {
				success: false,
				error: 'Failed to fetch chapter skip rules',
				rules: [],
			};
		}
	}

	async createChapterSkipRule(data: { pattern: string; enabled?: boolean }) {
		try {
			const trimmedPattern = data.pattern.trim();

			// 重複チェック
			const existingRule = await this.prisma.chapterSkipRule.findFirst({
				where: { pattern: trimmedPattern },
			});

			if (existingRule) {
				return {
					success: false,
					error: 'Pattern already exists',
					rule: null,
				};
			}

			const rule = await this.prisma.chapterSkipRule.create({
				data: {
					pattern: trimmedPattern,
					enabled: data.enabled ?? true,
				},
			});

			return { success: true, rule };
		} catch (error) {
			this.logger.error('Failed to create chapter skip rule', error);
			return {
				success: false,
				error: 'Failed to create chapter skip rule',
				rule: null,
			};
		}
	}

	async updateChapterSkipRule(
		id: string,
		data: { pattern?: string; enabled?: boolean },
	) {
		try {
			// pattern重複チェック（変更の場合）
			if (data.pattern !== undefined) {
				const trimmedPattern = data.pattern.trim();
				const existingRule = await this.prisma.chapterSkipRule.findFirst({
					where: { pattern: trimmedPattern, id: { not: id } },
				});

				if (existingRule) {
					return {
						success: false,
						error: 'Pattern already exists',
						rule: null,
					};
				}
			}

			const updateData: {
				pattern?: string;
				enabled?: boolean;
				updatedAt: Date;
			} = {
				updatedAt: new Date(),
			};

			if (data.pattern !== undefined) {
				updateData.pattern = data.pattern.trim();
			}

			if (data.enabled !== undefined) {
				updateData.enabled = data.enabled;
			}

			const rule = await this.prisma.chapterSkipRule.update({
				where: { id },
				data: updateData,
			});

			return { success: true, rule };
		} catch (error) {
			this.logger.error(`Failed to update chapter skip rule: ${id}`, error);
			return {
				success: false,
				error: 'Failed to update chapter skip rule',
				rule: null,
			};
		}
	}

	async deleteChapterSkipRule(id: string) {
		try {
			await this.prisma.chapterSkipRule.delete({
				where: { id },
			});

			return { success: true };
		} catch (error) {
			this.logger.error(`Failed to delete chapter skip rule: ${id}`, error);
			return {
				success: false,
				error: 'Failed to delete chapter skip rule',
			};
		}
	}

	// ユーザー設定関連
	async getUserSettings() {
		try {
			let settings = await this.prisma.userSettings.findUnique({
				where: { id: 'user_settings' },
			});

			if (!settings) {
				settings = await this.prisma.userSettings.create({
					data: { id: 'user_settings' },
				});
			}

			return {
				success: true,
				chapterSkipEnabled: settings.chapterSkipEnabled,
				skipNotificationShow: settings.skipNotificationShow,
			};
		} catch (error) {
			this.logger.error('Failed to fetch user settings', error);
			return {
				success: false,
				error: 'Failed to fetch user settings',
				chapterSkipEnabled: true,
				skipNotificationShow: true,
			};
		}
	}

	async updateUserSettings(data: {
		chapterSkipEnabled?: boolean;
		skipNotificationShow?: boolean;
	}) {
		try {
			const settings = await this.prisma.userSettings.upsert({
				where: { id: 'user_settings' },
				update: data,
				create: { id: 'user_settings', ...data },
			});

			return {
				success: true,
				chapterSkipEnabled: settings.chapterSkipEnabled,
				skipNotificationShow: settings.skipNotificationShow,
			};
		} catch (error) {
			this.logger.error('Failed to update user settings', error);
			return {
				success: false,
				error: 'Failed to update user settings',
				chapterSkipEnabled: true,
				skipNotificationShow: true,
			};
		}
	}
}