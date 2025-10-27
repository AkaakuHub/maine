import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { corsOptions } from "./config/cors.config";

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

	await app.listen(process.env.PORT ?? 3001);
	console.log(
		`Backend server running on http://localhost:${process.env.PORT ?? 3001}`,
	);
	console.log(
		`API Documentation: http://localhost:${process.env.PORT ?? 3001}/api/docs`,
	);
}
bootstrap();
