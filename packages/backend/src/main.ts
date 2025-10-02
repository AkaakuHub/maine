import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// CORS設定
	app.enableCors({
		origin: ["http://localhost:3000"], // フロントエンドのURL
		credentials: true,
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
		.setTitle("My Video Storage API")
		.setDescription("Video storage and management API")
		.setVersion("1.0")
		.addTag("videos")
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api/docs", app, document);

	// プレフィックスを追加してAPIパスを統一
	app.setGlobalPrefix("api");

	await app.listen(process.env.PORT ?? 3001);
	console.log(
		`Backend server running on http://localhost:${process.env.PORT ?? 3001}`,
	);
	console.log(
		`API Documentation: http://localhost:${process.env.PORT ?? 3001}/api/docs`,
	);
}
bootstrap();
