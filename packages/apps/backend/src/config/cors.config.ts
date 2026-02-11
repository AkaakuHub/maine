/**
 * CORS設定を管理する設定ファイル
 */

import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"https://localhost:3000",
	"http://localhost:3001",
];

function normalizeOrigin(origin: string): string {
	return origin.trim().replace(/\/+$/, "").toLowerCase();
}

export function getAllowedOrigins(): string[] {
	const raw = process.env.CORS_ORIGINS;
	const parsed = raw
		? raw
				.split(",")
				.map((origin) => normalizeOrigin(origin))
				.filter((origin) => origin.length > 0)
		: DEFAULT_ALLOWED_ORIGINS.map((origin) => normalizeOrigin(origin));

	return [...new Set(parsed)];
}

export function isOriginAllowed(origin?: string): boolean {
	if (!origin) {
		return true;
	}
	return getAllowedOrigins().includes(normalizeOrigin(origin));
}

export function createCorsOptions(): CorsOptions {
	return {
		origin: (origin, callback) => {
			if (!origin || isOriginAllowed(origin)) {
				callback(null, true);
				return;
			}
			console.warn("[CORS] blocked origin:", origin);
			callback(new Error(`Not allowed by CORS: ${origin}`), false);
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Range",
			"Accept",
			"Origin",
			"X-Requested-With",
		],
		exposedHeaders: [
			"Content-Length",
			"Content-Range",
			"Accept-Ranges",
			"Content-Disposition",
		],
		preflightContinue: false,
		optionsSuccessStatus: 204,
	};
}
