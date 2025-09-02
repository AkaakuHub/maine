import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";

async function handleProgressUpdate(request: NextRequest) {
	try {
		const body = await request.json();
		const { filePath, watchTime, watchProgress, isLiked, isInWatchlist } = body;

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
				{ status: 400 },
			);
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
		const updatedVideo = await prisma.videoProgress.upsert({
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

		return NextResponse.json({
			success: true,
			data: updatedVideo,
		});
	} catch (error) {
		console.error("Error updating video:", error);
		return NextResponse.json(
			{ error: "Failed to update video" },
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const filePath = searchParams.get("filePath");

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
				{ status: 400 },
			);
		}

		const videoProgress = await prisma.videoProgress.findUnique({
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
			return NextResponse.json({
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
			});
		}

		return NextResponse.json({
			success: true,
			data: videoProgress,
		});
	} catch (error) {
		console.error("Error fetching video progress:", error);
		return NextResponse.json(
			{ error: "Failed to fetch video progress" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	return handleProgressUpdate(request);
}

export async function PUT(request: NextRequest) {
	return handleProgressUpdate(request);
}
