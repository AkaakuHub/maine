import { Module } from '@nestjs/common';
import { ProgramInfoService } from './program-info.service';
import { ProgramInfoController } from './program-info.controller';

@Module({
	controllers: [ProgramInfoController],
	providers: [ProgramInfoService],
	exports: [ProgramInfoService],
})
export class SystemModule {}