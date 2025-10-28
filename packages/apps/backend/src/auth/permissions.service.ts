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
		const _permission = await this.prisma.permission.findFirst({
			where: {
				userId,
				directoryPath: {
					startsWith: directoryPath,
				},
			},
		});

		// ディレクトリパスの権限を再帰的にチェック
		const hasAccess = await this.checkRecursiveAccess(userId, directoryPath);
		return hasAccess;
	}

	private async checkRecursiveAccess(
		userId: string,
		directoryPath: string,
	): Promise<boolean> {
		// ルートディレクトリからチェック
		const pathSegments = directoryPath.split("/").filter(Boolean);
		let currentPath = "/";

		// ルートディレクトリの権限をチェック
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

		// 各ディレクトリレベルで権限をチェック
		for (const segment of pathSegments) {
			currentPath += `${segment}/`;
			const permission = await this.prisma.permission.findUnique({
				where: {
					userId_directoryPath: {
						userId,
						directoryPath: currentPath,
					},
				},
			});

			if (permission?.canRead) {
				return true;
			}
		}

		return false;
	}

	async grantPermission(
		userId: string,
		directoryPath: string,
		canRead = true,
		canWrite = false,
	) {
		return this.prisma.permission.upsert({
			where: {
				userId_directoryPath: {
					userId,
					directoryPath,
				},
			},
			update: {
				canRead,
				canWrite,
			},
			create: {
				userId,
				directoryPath,
				canRead,
				canWrite,
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
		return this.grantPermission(userId, "/", true, false);
	}
}
