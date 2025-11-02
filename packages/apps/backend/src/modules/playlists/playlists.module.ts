import { Module } from "@nestjs/common";
import { PlaylistsController } from "./playlists.controller";
import { PermissionsService } from "../../auth/permissions.service";
import { PrismaService } from "../../common/database/prisma.service";

@Module({
	controllers: [PlaylistsController],
	providers: [PermissionsService, PrismaService],
	exports: [PermissionsService],
})
export class PlaylistsModule {}
