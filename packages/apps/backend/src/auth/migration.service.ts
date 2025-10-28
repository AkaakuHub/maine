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

		// 既存のVideoProgressデータを管理者ユーザーに関連付け
		const orphanedProgress = await this.prisma.videoProgress.findMany({
			where: {
				userId: null,
			},
		});

		if (orphanedProgress.length > 0) {
			console.log(
				`${orphanedProgress.length}件のVideoProgressデータを管理者ユーザーに関連付けます...`,
			);

			await this.prisma.videoProgress.updateMany({
				where: {
					userId: null,
				},
				data: {
					userId: adminUser.id,
				},
			});

			console.log("データ移行が完了しました。");
		} else {
			console.log("移行対象のデータはありませんでした。");
		}

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
			migratedCount: orphanedProgress.length,
		};
	}
}
