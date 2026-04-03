import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	UseGuards,
	Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PermissionsService } from "./permissions.service";
import { Roles } from "./decorators/roles.decorator";
import { RolesGuard } from "./roles.guard";
import { CurrentUserId } from "./decorators/current-user-id.decorator";

@ApiTags("permissions")
@Controller("permissions")
export class PermissionsController {
	constructor(private readonly permissionsService: PermissionsService) {}

	@Get("check")
	@ApiOperation({ summary: "ディレクトリアクセス権限の確認" })
	@ApiResponse({ status: 200, description: "アクセス権限の確認結果" })
	async checkAccess(
		@CurrentUserId() userId: string,
		@Query("path") path: string,
	) {
		const hasAccess = await this.permissionsService.checkDirectoryAccess(
			userId,
			path || "/",
		);
		return { hasAccess, path: path || "/" };
	}

	@Get("my-permissions")
	@ApiOperation({ summary: "自分の権限一覧取得" })
	@ApiResponse({ status: 200, description: "自分の権限一覧" })
	async getMyPermissions(@CurrentUserId() userId: string) {
		return this.permissionsService.getUserPermissions(userId);
	}

	@Get("users")
	@UseGuards(RolesGuard)
	@Roles("ADMIN")
	@ApiOperation({ summary: "全ユーザーの権限一覧取得（管理者のみ）" })
	@ApiResponse({ status: 200, description: "全ユーザーの権限一覧" })
	async getAllUsersWithPermissions() {
		return this.permissionsService.getAllUsersWithPermissions();
	}

	@Post("grant")
	@UseGuards(RolesGuard)
	@Roles("ADMIN")
	@ApiOperation({ summary: "ユーザーに権限を付与（管理者のみ）" })
	@ApiResponse({ status: 200, description: "権限付与結果" })
	async grantPermission(
		@Body()
		grantData: {
			userId: string;
			directoryPath: string;
			canRead?: boolean;
			canWrite?: boolean;
		},
	) {
		return this.permissionsService.grantPermission(
			grantData.userId,
			grantData.directoryPath,
			grantData.canRead ?? true,
		);
	}

	@Put(":userId/:directoryPath")
	@UseGuards(RolesGuard)
	@Roles("ADMIN")
	@ApiOperation({ summary: "ユーザー権限の更新（管理者のみ）" })
	@ApiResponse({ status: 200, description: "権限更新結果" })
	async updatePermission(
		@Param("userId") userId: string,
		@Param("directoryPath") directoryPath: string,
		@Body()
		updateData: {
			canRead?: boolean;
			canWrite?: boolean;
		},
	) {
		return this.permissionsService.grantPermission(
			userId,
			decodeURIComponent(directoryPath),
			updateData.canRead ?? true,
		);
	}

	@Delete(":userId/:directoryPath")
	@UseGuards(RolesGuard)
	@Roles("ADMIN")
	@ApiOperation({ summary: "ユーザー権限の削除（管理者のみ）" })
	@ApiResponse({ status: 200, description: "権限削除結果" })
	async revokePermission(
		@Param("userId") userId: string,
		@Param("directoryPath") directoryPath: string,
	) {
		return this.permissionsService.revokePermission(
			userId,
			decodeURIComponent(directoryPath),
		);
	}
}
