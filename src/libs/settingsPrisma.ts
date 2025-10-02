import { PrismaClient } from "../../packages/backend/prisma/generated/settings";

const globalForSettingsPrisma = globalThis as unknown as {
	settingsPrisma: PrismaClient | undefined;
};

export const settingsPrisma =
	globalForSettingsPrisma.settingsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production")
	globalForSettingsPrisma.settingsPrisma = settingsPrisma;
