import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
	derivePasswordVerifier,
	generateAuthSalt,
} from "../src/auth/password.utils";

const prisma = new PrismaClient();

interface CliOptions {
	username?: string;
	password?: string;
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

	const passwordHash = await bcrypt.hash(password, 10);
	const authSalt = generateAuthSalt();
	const passwordVerifier = derivePasswordVerifier(password, authSalt);

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
