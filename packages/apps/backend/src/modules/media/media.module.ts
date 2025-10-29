import { Module } from "@nestjs/common";
import { ThumbnailsController } from "./thumbnails.controller";

@Module({
	controllers: [ThumbnailsController],
	providers: [],
	exports: [],
})
export class MediaModule {}
