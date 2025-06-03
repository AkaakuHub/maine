import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { id, watchTime, watchProgress, isLiked } = body;

		if (!id) {
			return NextResponse.json(
				{ error: "Anime ID is required" },
				{ status: 400 },
			);
		}

		// 更新データを準備
		const updateData: any = {
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
		const updatedAnime = await prisma.anime.update({
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
			data: updatedAnime,
		});
	} catch (error) {
		console.error("Error updating anime:", error);
		return NextResponse.json(
			{ error: "Failed to update anime" },
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
				{ error: "Anime ID is required" },
				{ status: 400 },
			);
		}

		const anime = await prisma.anime.findUnique({
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

		if (!anime) {
			return NextResponse.json({ error: "Anime not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: anime,
		});
	} catch (error) {
		console.error("Error fetching anime progress:", error);
		return NextResponse.json(
			{ error: "Failed to fetch anime progress" },
			{ status: 500 },
		);
	}
}
