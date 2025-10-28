import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class PermissionsService {
	constructor(private readonly prisma: PrismaService) {}

	async checkDirectoryAccess(
		userId: string,
		directoryPath: string,
	): Promise<boolean> {
		// 管理者は全てのディレクトリにアクセス可能
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});

		if (user?.role === "ADMIN") {
			return true;
		}

		// ユーザーの権限をチェック
		const permission = await this.prisma.permission.findFirst({
			where: {
				userId,
				directoryPath: {
					startsWith: directoryPath,
				},
			},
		});

		// 読み取り権限がある場合はOK
		if (permission?.canRead) {
			return true;
		}

		// 親根ディレクトリの権限をチェック
		const rootPermission = await this.prisma.permission.findUnique({
			where: {
				userId_directoryPath: {
					userId,
					directoryPath: "/",
				},
			},
		});

		if (rootPermission?.canRead) {
			return true;
		}

		return false;
	}

	async grantPermission(userId: string, directoryPath: string, canRead = true) {
		return this.prisma.permission.upsert({
			where: {
				userId_directoryPath: {
					userId,
					directoryPath,
				},
			},
			update: {
				canRead,
			},
			create: {
				userId,
				directoryPath,
				canRead,
			},
		});
	}

	async revokePermission(userId: string, directoryPath: string) {
		return this.prisma.permission.delete({
			where: {
				userId_directoryPath: {
					userId,
					directoryPath,
				},
			},
		});
	}

	async getUserPermissions(userId: string) {
		return this.prisma.permission.findMany({
			where: { userId },
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true,
					},
				},
			},
			orderBy: {
				directoryPath: "asc",
			},
		});
	}

	async getAllUsersWithPermissions() {
		return this.prisma.user.findMany({
			include: {
				permissions: {
					orderBy: {
						directoryPath: "asc",
					},
				},
				_count: {
					select: {
						permissions: true,
					},
				},
			},
			orderBy: {
				username: "asc",
			},
		});
	}

	async initializeUserPermissions(userId: string) {
		// 新規ユーザーのデフォルト権限（ルートディレクトリへの読み取り権限）
		return this.grantPermission(userId, "/", true);
	}
}
