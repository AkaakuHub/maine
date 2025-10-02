import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { PrismaService } from "../../common/database/prisma.service";
import { VideoDetailController } from "./video-detail.controller";
import { VideoController } from "./video.controller";
import { VideosController } from "./videos.controller";
import { VideosService } from "./videos.service";

@Module({
	imports: [DatabaseModule],
	controllers: [VideosController, VideoController, VideoDetailController],
	providers: [VideosService, PrismaService],
	exports: [VideosService],
})
export class VideosModule {}
