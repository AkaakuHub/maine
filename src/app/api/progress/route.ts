import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { id, watchTime, watchProgress, isLiked } = body;

		if (!id) {
			return NextResponse.json(
				{ error: "Video ID is required" },
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

		// データベースを更新
		const updatedVideo = await prisma.video.update({
			where: { id },
			data: updateData,
			select: {
				id: true,
				watchTime: true,
				watchProgress: true,
				isLiked: true,
				likedAt: true,
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
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Video ID is required" },
				{ status: 400 },
			);
		}

		const video = await prisma.video.findUnique({
			where: { id },
			select: {
				id: true,
				watchTime: true,
				watchProgress: true,
				isLiked: true,
				likedAt: true,
				lastWatched: true,
			},
		});

		if (!video) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: video,
		});
	} catch (error) {
		console.error("Error fetching video progress:", error);
		return NextResponse.json(
			{ error: "Failed to fetch video progress" },
			{ status: 500 },
		);
	}
}
