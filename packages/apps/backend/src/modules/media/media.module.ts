import { Module } from "@nestjs/common";
import {
	FFprobeMetadataExtractorService,
	ThumbnailGeneratorService,
} from "./thumbnail-generator.service";
import { ThumbnailsController } from "./thumbnails.controller";

@Module({
	controllers: [ThumbnailsController],
	providers: [ThumbnailGeneratorService, FFprobeMetadataExtractorService],
	exports: [ThumbnailGeneratorService, FFprobeMetadataExtractorService],
})
export class MediaModule {}
