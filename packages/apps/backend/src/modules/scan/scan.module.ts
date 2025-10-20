import { Module } from "@nestjs/common";
import { ScanControlController } from "./scan-control.controller";
import { SseController } from "./scan-events.controller";
import { ScanSettingsController } from "./scan-settings.controller";
import { ScanSettingsService } from "./scan-settings.service";
import { ScanStartController } from "./scan-start.controller";
import { ScanService } from "./scan.service";
import { VideosModule } from "../videos/videos.module";

@Module({
	imports: [VideosModule],
	controllers: [
		ScanStartController,
		ScanSettingsController,
		ScanControlController,
		SseController,
	],
	providers: [ScanService, ScanSettingsService],
	exports: [ScanService, ScanSettingsService],
})
export class ScanModule {}
