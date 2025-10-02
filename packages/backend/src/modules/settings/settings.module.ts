import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ChapterSkipController } from './chapter-skip.controller';

@Module({
	controllers: [ChapterSkipController],
	providers: [SettingsService],
	exports: [SettingsService],
})
export class SettingsModule {}