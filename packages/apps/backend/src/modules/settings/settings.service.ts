import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "../../libs/prisma";

@Injectable()
export class SettingsService {
	private readonly logger = new Logger(SettingsService.name);

	// チャプタースキップルール関連
	async getChapterSkipRules() {
		try {
			const rules = await prisma.chapterSkipRule.findMany({
				orderBy: { createdAt: "asc" },
			});
			return { success: true, rules };
		} catch (error) {
			this.logger.error("Failed to fetch chapter skip rules", error);
			return {
				success: false,
				error: "チャプタースキップルールの取得に失敗しました",
				rules: [],
			};
		}
	}

	async createChapterSkipRule(data: { pattern: string; enabled?: boolean }) {
		try {
			const trimmedPattern = data.pattern.trim();

			// 重複チェック
			const existingRule = await prisma.chapterSkipRule.findFirst({
				where: { pattern: trimmedPattern },
			});

			if (existingRule) {
				return {
					success: false,
					error: "パターンは既に存在します",
					rule: null,
				};
			}

			const rule = await prisma.chapterSkipRule.create({
				data: {
					pattern: trimmedPattern,
					enabled: data.enabled ?? true,
				},
			});

			return { success: true, rule };
		} catch (error) {
			this.logger.error("Failed to create chapter skip rule", error);
			return {
				success: false,
				error: "チャプタースキップルールの作成に失敗しました",
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
				const existingRule = await prisma.chapterSkipRule.findFirst({
					where: { pattern: trimmedPattern, id: { not: id } },
				});

				if (existingRule) {
					return {
						success: false,
						error: "パターンは既に存在します",
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

			const rule = await prisma.chapterSkipRule.update({
				where: { id },
				data: updateData,
			});

			return { success: true, rule };
		} catch (error) {
			this.logger.error(`Failed to update chapter skip rule: ${id}`, error);
			return {
				success: false,
				error: "チャプタースキップルールの更新に失敗しました",
				rule: null,
			};
		}
	}

	async deleteChapterSkipRule(id: string) {
		try {
			await prisma.chapterSkipRule.delete({
				where: { id },
			});

			return { success: true };
		} catch (error) {
			this.logger.error(`Failed to delete chapter skip rule: ${id}`, error);
			return {
				success: false,
				error: "チャプタースキップルールの削除に失敗しました",
			};
		}
	}

	// ユーザー設定関連
	async getUserSettings() {
		try {
			let settings = await prisma.userSettings.findUnique({
				where: { id: "user_settings" },
			});

			if (!settings) {
				settings = await prisma.userSettings.create({
					data: { id: "user_settings" },
				});
			}

			return {
				success: true,
				chapterSkipEnabled: settings.chapterSkipEnabled,
				skipNotificationShow: settings.skipNotificationShow,
			};
		} catch (error) {
			this.logger.error("Failed to fetch user settings", error);
			return {
				success: false,
				error: "ユーザー設定の取得に失敗しました",
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
			const settings = await prisma.userSettings.upsert({
				where: { id: "user_settings" },
				update: data,
				create: { id: "user_settings", ...data },
			});

			return {
				success: true,
				chapterSkipEnabled: settings.chapterSkipEnabled,
				skipNotificationShow: settings.skipNotificationShow,
			};
		} catch (error) {
			this.logger.error("Failed to update user settings", error);
			return {
				success: false,
				error: "ユーザー設定の更新に失敗しました",
				chapterSkipEnabled: true,
				skipNotificationShow: true,
			};
		}
	}
}
