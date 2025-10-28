import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { PrismaService } from "../../common/database/prisma.service";
import { AuthModule } from "../../auth/auth.module";
import { VideoController } from "./video.controller";
import { VideosController } from "./videos.controller";
import { VideoIdController } from "./videoId.controller";
import { VideosService } from "./videos.service";

@Module({
	imports: [DatabaseModule, AuthModule],
	controllers: [VideosController, VideoController, VideoIdController],
	providers: [VideosService, PrismaService],
	exports: [VideosService],
})
export class VideosModule {}
