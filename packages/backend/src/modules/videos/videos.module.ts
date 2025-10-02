import { Module } from "@nestjs/common";
import { VideosController } from "./videos.controller";
import { VideoController } from "./video.controller";
import { VideoDetailController } from "./video-detail.controller";
import { VideosService } from "./videos.service";

@Module({
	controllers: [VideosController, VideoController, VideoDetailController],
	providers: [VideosService],
	exports: [VideosService],
})
export class VideosModule {}
