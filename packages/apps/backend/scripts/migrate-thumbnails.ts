import { promises as fs, existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

loadEnvFileIfNeeded();

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
			thumbnail_path: true,
		},
	});

	stats.total = videos.length;

	for (const video of videos) {
		const targetRelative = `${video.id}.webp`;
		const currentRelative = video.thumbnail_path?.trim();

		if (!currentRelative) {
			stats.noThumbnailInfo += 1;
			console.warn(
				`[SKIP:no-thumbnail] id=${video.id} (${video.fileName}) has no thumbnail_path record`,
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
				`[SKIP:missing-file] ${currentAbsolute} not found for id=${video.id}`,
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
				`[RENAMED] ${currentRelative} -> ${targetRelative} for id=${video.id}`,
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

function loadEnvFileIfNeeded() {
	if (process.env.DATABASE_URL) {
		return;
	}

	const backendRoot = path.resolve(__dirname, "..", "..");
	const searchCandidates = [
		path.resolve(process.cwd(), ".env"),
		path.resolve(process.cwd(), ".env.local"),
		path.resolve(backendRoot, ".env"),
		path.resolve(backendRoot, ".env.local"),
	].filter((envPath, index, all) => all.indexOf(envPath) === index);

	for (const envPath of searchCandidates) {
		if (!existsSync(envPath)) {
			continue;
		}

		mergeEnvFromFile(envPath);
		if (process.env.DATABASE_URL) {
			console.log(`Loaded environment variables from ${envPath}`);
			return;
		}
	}

	const defaultSqlitePath = path.resolve(backendRoot, "prisma", "dev.db");
	if (existsSync(defaultSqlitePath)) {
		process.env.DATABASE_URL = `file:${defaultSqlitePath}`;
		console.warn(
			"DATABASE_URL was not set. Falling back to local prisma/dev.db file.",
		);
		return;
	}

	throw new Error(
		"DATABASE_URL is not configured. Set it or add it to packages/apps/backend/.env.",
	);
}

function mergeEnvFromFile(envPath: string) {
	const raw = readFileSync(envPath, "utf8");
	for (const line of raw.split(/\r?\n/)) {
		if (!line || line.trim().startsWith("#")) {
			continue;
		}

		const match = line.match(/^\s*([A-Z0-9_\.\-]+)\s*=\s*(.*)\s*$/i);
		if (!match) {
			continue;
		}

		const key = match[1];
		let value = match[2] ?? "";

		if (
			(value.startsWith("\"") && value.endsWith("\"")) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		} else {
			const hashIndex = value.indexOf("#");
			if (hashIndex !== -1) {
				value = value.slice(0, hashIndex).trimEnd();
			}
		}

		value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");

		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}
