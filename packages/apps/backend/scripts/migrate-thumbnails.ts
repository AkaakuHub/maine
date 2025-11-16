import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const THUMBNAIL_DIR = path.resolve(process.cwd(), "data", "thumbnails");

interface MigrationStats {
	total: number;
	renamed: number;
	missingFile: number;
	alreadyUpToDate: number;
	destinationExists: number;
	noThumbnailInfo: number;
	updatedRecords: number;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function migrateThumbnails() {
	const stats: MigrationStats = {
		total: 0,
		renamed: 0,
		missingFile: 0,
		alreadyUpToDate: 0,
		destinationExists: 0,
		noThumbnailInfo: 0,
		updatedRecords: 0,
	};

	console.log(`Using thumbnail directory: ${THUMBNAIL_DIR}`);
	console.log("Fetching video metadata records...");
	const videos = await prisma.videoMetadata.findMany({
		select: {
			id: true,
			filePath: true,
			fileName: true,
			videoId: true,
			thumbnail_path: true,
		},
	});

	stats.total = videos.length;

	for (const video of videos) {
		const targetRelative = `${video.videoId}.webp`;
		const currentRelative = video.thumbnail_path?.trim();

		if (!currentRelative) {
			stats.noThumbnailInfo += 1;
			console.warn(
				`[SKIP:no-thumbnail] videoId=${video.videoId} (${video.fileName}) has no thumbnail_path record`,
			);
			continue;
		}

		if (currentRelative === targetRelative) {
			stats.alreadyUpToDate += 1;
			continue;
		}

		const currentAbsolute = path.join(THUMBNAIL_DIR, currentRelative);
		const targetAbsolute = path.join(THUMBNAIL_DIR, targetRelative);

		if (!existsSync(currentAbsolute)) {
			stats.missingFile += 1;
			console.warn(
				`[SKIP:missing-file] ${currentAbsolute} not found for videoId=${video.videoId}`,
			);
			continue;
		}

		if (await fileExists(targetAbsolute)) {
			stats.destinationExists += 1;
			console.warn(
				`[INFO:dest-exists] ${targetAbsolute} already exists. Removing old ${currentAbsolute}.`,
			);
			try {
				if (currentAbsolute !== targetAbsolute) {
					await fs.unlink(currentAbsolute);
				}
			} catch (error) {
				console.error(
					`Failed to remove legacy thumbnail ${currentAbsolute}:`,
					error,
				);
				continue;
			}
		} else {
			await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
			await fs.rename(currentAbsolute, targetAbsolute);
			stats.renamed += 1;
			console.log(
				`[RENAMED] ${currentRelative} -> ${targetRelative} for videoId=${video.videoId}`,
			);
		}

		await prisma.videoMetadata.update({
			where: { id: video.id },
			data: { thumbnail_path: targetRelative },
		});
		stats.updatedRecords += 1;
	}

	console.log("\nMigration summary:");
	console.log(stats);
}

migrateThumbnails()
	.catch((error) => {
		console.error("Thumbnail migration failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
