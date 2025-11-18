import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import {
	derivePasswordVerifier,
	generateAuthSalt,
} from "../src/auth/password.utils";

loadEnvFileIfNeeded();

const prisma = new PrismaClient();

interface CliOptions {
	username?: string;
	password?: string;
}


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

function parseArgs(argv: string[]): CliOptions {
	return argv.reduce<CliOptions>((options, arg) => {
		if (arg.startsWith("--username=")) {
			options.username = arg.replace("--username=", "");
		}
		if (arg.startsWith("--password=")) {
			options.password = arg.replace("--password=", "");
		}
		return options;
	}, {});
}

async function migratePassword(username: string, password: string) {
	const user = await prisma.user.findUnique({ where: { username } });
	if (!user) {
		throw new Error(`ユーザー ${username} が見つかりません`);
	}

	const authSalt = generateAuthSalt();
	const passwordVerifier = derivePasswordVerifier(password, authSalt);
	const passwordHash = await bcrypt.hash(passwordVerifier, 10);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			passwordHash,
			authSalt,
			passwordVerifier,
		},
	});

	console.log(`Updated verifier for ${username}`);
}

async function main() {
	try {
		const { username = process.env.TARGET_USER, password = process.env.TARGET_PASS } =
			parseArgs(process.argv.slice(2));

		if (!username || !password) {
			console.error(
				"Usage: pnpm ts-node scripts/migrate-password.ts --username=<name> --password=<plain>",
			);
			console.error(
				"または環境変数 TARGET_USER/TARGET_PASS を設定してください",
			);
			process.exit(1);
		}

		await migratePassword(username, password);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	} finally {
		await prisma.$disconnect();
	}
}

void main();
