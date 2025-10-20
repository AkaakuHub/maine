import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";

@Injectable()
export class ProgressService {
	private readonly logger = new Logger(ProgressService.name);

	constructor(private readonly prisma: PrismaService) {}

	async getVideoProgress(filePath: string) {
		try {
			if (!filePath) {
				return {
					success: false,
					error: "ファイルパスが必要です",
				};
			}

			const videoProgress = await this.prisma.videoProgress.findUnique({
				where: { filePath },
				select: {
					filePath: true,
					watchTime: true,
					watchProgress: true,
					isLiked: true,
					likedAt: true,
					isInWatchlist: true,
					watchlistAt: true,
					lastWatched: true,
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
						likedAt: null,
						isInWatchlist: false,
						watchlistAt: null,
						lastWatched: null,
					},
				};
			}

			return {
				success: true,
				data: videoProgress,
			};
		} catch (error) {
			this.logger.error("Error fetching video progress:", error);
			return {
				success: false,
				error: "動画進捗の取得に失敗しました",
			};
		}
	}

	async updateVideoProgress(data: {
		filePath: string;
		watchTime?: number;
		watchProgress?: number;
		isLiked?: boolean;
		isInWatchlist?: boolean;
	}) {
		try {
			const { filePath, watchTime, watchProgress, isLiked, isInWatchlist } =
				data;

			if (!filePath) {
				return {
					success: false,
					error: "ファイルパスが必要です",
				};
			}

			// 更新データを準備
			const updateData: {
				watchTime?: number;
				lastWatched?: Date;
				watchProgress?: number;
				isLiked?: boolean;
				likedAt?: Date | null;
				isInWatchlist?: boolean;
				watchlistAt?: Date | null;
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
				updateData.likedAt = isLiked ? new Date() : null;
			}

			// ウォッチリスト状態の更新
			if (typeof isInWatchlist === "boolean") {
				updateData.isInWatchlist = isInWatchlist;
				updateData.watchlistAt = isInWatchlist ? new Date() : null;
			}

			// データベースを更新（upsert使用）
			const updatedVideo = await this.prisma.videoProgress.upsert({
				where: { filePath },
				update: updateData,
				create: {
					filePath,
					...updateData,
				},
				select: {
					filePath: true,
					watchTime: true,
					watchProgress: true,
					isLiked: true,
					likedAt: true,
					isInWatchlist: true,
					watchlistAt: true,
					lastWatched: true,
				},
			});

			return {
				success: true,
				data: updatedVideo,
			};
		} catch (error) {
			this.logger.error("Error updating video:", error);
			return {
				success: false,
				error: "動画の更新に失敗しました",
			};
		}
	}
}
