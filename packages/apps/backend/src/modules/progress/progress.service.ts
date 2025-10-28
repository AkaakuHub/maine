import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";

type VideoProgressData = {
	filePath: string;
	watchTime: number | null;
	watchProgress: number;
	isLiked: boolean;
	likedAt: Date | null;
	isInWatchlist: boolean;
	watchlistAt: Date | null;
	lastWatched: Date | null;
};

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

			// ユーザーが指定されている場合はユーザー付きで検索
			let videoProgress: VideoProgressData | null = null;

			if (userId) {
				videoProgress = await this.prisma.videoProgress.findUnique({
					where: { filePath_userId: { filePath, userId } },
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
			} else {
				// 後方互換性のため、最初に一致するレコードを検索
				videoProgress = await this.prisma.videoProgress.findFirst({
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
			}

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

	async updateVideoProgress(
		data: {
			filePath: string;
			watchTime?: number;
			watchProgress?: number;
			isLiked?: boolean;
			isInWatchlist?: boolean;
		},
		userId?: string,
	) {
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

			// ユーザーが指定されている場合はユーザー付きでupsert
			const upsertData = {
				...updateData,
				...(userId && { userId }),
			};

			// ユーザーが指定されている場合のみupsertを使用
			let updatedVideo: VideoProgressData | null = null;

			if (userId) {
				updatedVideo = await this.prisma.videoProgress.upsert({
					where: { filePath_userId: { filePath, userId } },
					update: upsertData,
					create: {
						filePath,
						...upsertData,
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
			} else {
				// 後方互換性：既存のレコードを更新または作成
				const existingRecord = await this.prisma.videoProgress.findFirst({
					where: { filePath },
				});

				if (existingRecord) {
					updatedVideo = await this.prisma.videoProgress.update({
						where: { id: existingRecord.id },
						data: upsertData,
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
				} else {
					updatedVideo = await this.prisma.videoProgress.create({
						data: {
							filePath,
							...upsertData,
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
				}
			}

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
