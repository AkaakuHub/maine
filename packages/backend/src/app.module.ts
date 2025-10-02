import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./common/database/database.module";
import { VideosModule } from "./modules/videos/videos.module";
import { ScanModule } from "./modules/scan/scan.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { ChaptersModule } from "./modules/chapters/chapters.module";
import { MediaModule } from "./modules/media/media.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SystemModule } from "./modules/system/system.module";
import { ScheduleModule } from "./modules/schedule/schedule.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		DatabaseModule,
		VideosModule,
		ScanModule,
		ProgressModule,
		ChaptersModule,
		MediaModule,
		SettingsModule,
		SystemModule,
		ScheduleModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
