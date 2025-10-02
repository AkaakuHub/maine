import { Module } from "@nestjs/common";
import { ProgramInfoController } from "./program-info.controller";
import { ProgramInfoService } from "./program-info.service";

@Module({
	controllers: [ProgramInfoController],
	providers: [ProgramInfoService],
	exports: [ProgramInfoService],
})
export class SystemModule {}
