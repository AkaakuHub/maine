import { Module } from "@nestjs/common";
import { ScanStartController } from "./scan-start.controller";
import { ScanSettingsController } from "./scan-settings.controller";
import { ScanControlController } from "./scan-control.controller";
import { SseController } from "./scan-events.controller";
import { ScanService } from "./scan.service";
import { ScanSettingsService } from "./scan-settings.service";

@Module({
	controllers: [ScanStartController, ScanSettingsController, ScanControlController, SseController],
	providers: [ScanService, ScanSettingsService],
	exports: [ScanService, ScanSettingsService],
})
export class ScanModule {}
