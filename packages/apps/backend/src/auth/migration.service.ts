import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { AuthService } from "./auth.service";

@Injectable()
export class MigrationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly authService: AuthService,
	) {}

	async migrateExistingData() {
		console.log("データ移行を開始します...");

		// デフォルト管理者ユーザーを作成
		const adminUser = await this.authService.createDefaultAdmin();

		// videoProgressテーブルは削除されたため、移行処理は不要
		console.log(
			"VideoProgressテーブルの移行はスキップされます（テーブルは削除されました）",
		);

		// デフォルト権限を設定（管理者は全ディレクトリにアクセス可能）
		await this.prisma.permission.upsert({
			where: {
				userId_directoryPath: {
					userId: adminUser.id,
					directoryPath: "/", // ルートディレクトリへのアクセス権
				},
			},
			update: {},
			create: {
				userId: adminUser.id,
				directoryPath: "/",
				canRead: true,
				canWrite: true,
			},
		});

		console.log("管理者ユーザーに権限を設定しました。");

		return {
			adminUser,
			migratedCount: 0, // videoProgressテーブルは削除されたため移行不要
		};
	}
}
