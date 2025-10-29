/**
 * CORS設定を管理する設定ファイル
 */

export const allowedOrigins = process.env.CORS_ORIGINS
	? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
	: [
			"http://localhost:3000",
			"https://localhost:3000",
			"http://localhost:3001",
		];

export const corsOptions = {
	origin: allowedOrigins,
	credentials: true,
};
