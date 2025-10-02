import { Module } from "@nestjs/common";
import { ScanSchedulerService } from "../scan/scan-scheduler.service";
import { ScheduleStatusController } from "./schedule-status.controller";
import { ScheduleController } from "./schedule.controller";

@Module({
	controllers: [ScheduleStatusController, ScheduleController],
	providers: [ScanSchedulerService],
	exports: [ScanSchedulerService],
})
export class ScheduleModule {}
