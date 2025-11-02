import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";

@Injectable()
export class ProgressService {
	private readonly logger = new Logger(ProgressService.name);

	constructor(private readonly prisma: PrismaService) {}

	async getVideoProgress(filePath: string, userId?: string) {
		try {
			if (!filePath) {
				return {
					success: false,
					error: "ファイルパスが必要です",
				};
			}

			if (!userId) {
				// ユーザーがいない場合はデフォルト値を返す
				return {
					success: true,
					data: {
						filePath,
						watchTime: 0,
						watchProgress: 0,
						isLiked: false,
						lastWatched: null,
					},
				};
			}

			// VideoProgressテーブルからユーザーの進捗データを取得
			const videoProgress = await this.prisma.videoProgress.findUnique({
				where: {
					filePath_userId: {
						filePath,
						userId,
					},
				},
			});

			if (!videoProgress) {
				// 進捗データが存在しない場合はデフォルト値を返す
				return {
					success: true,
					data: {
						filePath,
						watchTime: 0,
						watchProgress: 0,
						isLiked: false,
						lastWatched: null,
					},
				};
			}

			return {
				success: true,
				data: {
					filePath,
					watchTime: videoProgress.watchTime ?? 0,
					watchProgress: videoProgress.watchProgress,
					isLiked: videoProgress.isLiked,
					lastWatched: videoProgress.lastWatched,
				},
			};
		} catch (error) {
			this.logger.error("Error fetching video progress:", error);
			return {
				success: false,
				error: "動画進捗の取得に失敗しました",
			};
		}
	}

	async updateVideoProgress(
		data: {
			filePath: string;
			watchTime?: number;
			watchProgress?: number;
			isLiked?: boolean;
		},
		userId?: string,
	) {
		try {
			const { filePath, watchTime, watchProgress, isLiked } = data;

			if (!filePath) {
				return {
					success: false,
					error: "ファイルパスが必要です",
				};
			}

			if (!userId) {
				return {
					success: false,
					error: "ユーザーIDが必要です",
				};
			}

			// 更新データを準備
			const updateData: {
				watchTime?: number;
				lastWatched?: Date;
				watchProgress?: number;
				isLiked?: boolean;
				updatedAt: Date;
			} = {
				updatedAt: new Date(),
			};

			// 視聴時間と進捗の更新
			if (typeof watchTime === "number") {
				updateData.watchTime = watchTime;
				updateData.lastWatched = new Date();
			}

			if (typeof watchProgress === "number") {
				updateData.watchProgress = Math.max(0, Math.min(100, watchProgress));
			}

			// ライク状態の更新
			if (typeof isLiked === "boolean") {
				updateData.isLiked = isLiked;
			}

			// VideoProgressをupsert
			const updatedVideo = await this.prisma.videoProgress.upsert({
				where: {
					filePath_userId: {
						filePath,
						userId,
					},
				},
				update: updateData,
				create: {
					filePath,
					userId,
					...updateData,
				},
			});

			return {
				success: true,
				data: {
					filePath,
					watchTime: updatedVideo.watchTime ?? 0,
					watchProgress: updatedVideo.watchProgress,
					isLiked: updatedVideo.isLiked,
					lastWatched: updatedVideo.lastWatched,
				},
			};
		} catch (error) {
			this.logger.error("Error updating video progress:", error);
			return {
				success: false,
				error: "動画進捗の更新に失敗しました",
			};
		}
	}
}
