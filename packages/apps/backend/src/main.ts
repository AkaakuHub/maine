import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { corsOptions } from "./config/cors.config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as https from "node:https";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// CORS設定
	app.enableCors(corsOptions);

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

			console.log(`Backend server running on https://localhost:${port}`);
			console.log(`API Documentation: https://localhost:${port}/api/docs`);
		} catch (error) {
			console.warn(
				"Failed to start HTTPS server, falling back to HTTP:",
				error.message,
			);
			await app.listen(port);
			console.log(`Backend server running on http://localhost:${port}`);
			console.log(`API Documentation: http://localhost:${port}/api/docs`);
		}
	} else {
		// 本番環境ではHTTP
		await app.listen(port);
		console.log(`Backend server running on http://localhost:${port}`);
		console.log(`API Documentation: http://localhost:${port}/api/docs`);
	}
}
bootstrap();
