import { Module } from '@nestjs/common';
import { ThumbnailsController } from './thumbnails.controller';
import { ThumbnailGeneratorService, FFprobeMetadataExtractorService } from './thumbnail-generator.service';

@Module({
	controllers: [ThumbnailsController],
	providers: [ThumbnailGeneratorService, FFprobeMetadataExtractorService],
	exports: [ThumbnailGeneratorService, FFprobeMetadataExtractorService],
})
export class MediaModule {}