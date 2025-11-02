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
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	// 異なるドメイン間でのCORS問題を緩和
	preflightContinue: false,
	optionsSuccessStatus: 204,
};
