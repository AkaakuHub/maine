import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { ChapterSkipController } from "./chapter-skip.controller";
import { SettingsService } from "./settings.service";

@Module({
	imports: [DatabaseModule],
	controllers: [ChapterSkipController],
	providers: [SettingsService],
	exports: [SettingsService],
})
export class SettingsModule {}
