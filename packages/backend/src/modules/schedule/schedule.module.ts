import { Module } from "@nestjs/common";
import { ScheduleStatusController } from "./schedule-status.controller";
import { ScheduleController } from "./schedule.controller";
import { ScanSchedulerService } from "../scan/scan-scheduler.service";

@Module({
	controllers: [ScheduleStatusController, ScheduleController],
	providers: [ScanSchedulerService],
	exports: [ScanSchedulerService],
})
export class ScheduleModule {}