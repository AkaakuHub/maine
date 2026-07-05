import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createCorsOptions, getAllowedOrigins } from "./config/cors.config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as https from "node:https";
import { createAppLogger } from "./common/logger";

async function bootstrap() {
	const logger = createAppLogger("Bootstrap");
	const app = await NestFactory.create(AppModule, {
		logger: createAppLogger("Nest"),
	});

	// CORS設定
	const allowedOrigins = getAllowedOrigins();
	app.enableCors(createCorsOptions());
	logger.debug({
		message: "CORS_ORIGINS",
		value: process.env.CORS_ORIGINS ?? null,
	});
	logger.debug({
		message: "Allowed CORS origins",
		value: allowedOrigins,
	});

	// バリデーションパイプのグローバル設定
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	// Swaggerドキュメント設定
	const config = new DocumentBuilder()
		.setTitle("Maine API")
		.setDescription("Video storage and management API")
		.setVersion("1.0")
		.addTag("videos")
		.build();

	// プレフィックスを追加してAPIパスを統一
	app.setGlobalPrefix("api");

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api/docs", app, document);

	// HTTPS設定（開発環境のみ）
	const isDevelopment = process.env.NODE_ENV !== "production";
	const port = process.env.PORT ?? 3001;

	if (isDevelopment) {
		try {
			// 自己署名証明書を読み込み
			const httpsOptions = {
				key: readFileSync(join(__dirname, "..", "certs", "key.pem")),
				cert: readFileSync(join(__dirname, "..", "certs", "cert.pem")),
			};

			await app.init();
			const server = https.createServer(
				httpsOptions,
				app.getHttpAdapter().getInstance(),
			);
			server.listen(port);

			logger.info(`Backend server running on https://localhost:${port}`);
			logger.info(`API Documentation: https://localhost:${port}/api/docs`);
		} catch (error) {
			logger.error("Failed to start HTTPS server", errorToTrace(error));
			throw error;
		}
	} else {
		// 本番環境ではHTTP
		await app.listen(port);
		logger.info(`Backend server running on http://localhost:${port}`);
		logger.info(`API Documentation: http://localhost:${port}/api/docs`);
	}
}

function errorToTrace(error: unknown): string | undefined {
	if (error instanceof Error) {
		return error.stack;
	}

	return undefined;
}

bootstrap();
