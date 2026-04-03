import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { ProgramInfoController } from "./program-info.controller";
import { ProgramInfoService } from "./program-info.service";

@Module({
	imports: [AuthModule],
	controllers: [ProgramInfoController],
	providers: [ProgramInfoService],
	exports: [ProgramInfoService],
})
export class SystemModule {}
