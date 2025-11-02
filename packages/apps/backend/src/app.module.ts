import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./common/database/database.module";
import { AuthModule } from "./auth/auth.module";
import { ChaptersModule } from "./modules/chapters/chapters.module";
import { MediaModule } from "./modules/media/media.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { ScanModule } from "./modules/scan/scan.module";
import { ScheduleModule } from "./modules/schedule/schedule.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SystemModule } from "./modules/system/system.module";
import { VideosModule } from "./modules/videos/videos.module";
import { PlaylistsModule } from "./modules/playlists/playlists.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env.local", ".env"],
		}),
		DatabaseModule,
		AuthModule,
		VideosModule,
		ScanModule,
		ProgressModule,
		ChaptersModule,
		MediaModule,
		SettingsModule,
		SystemModule,
		ScheduleModule,
		PlaylistsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
