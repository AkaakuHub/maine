import { Injectable } from "@nestjs/common";
import path from "node:path";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class PermissionsService {
	constructor(private readonly prisma: PrismaService) {}

	private getPathModule(
		targetPath: string,
	): typeof path.posix | typeof path.win32 {
		return targetPath.includes("\\") ? path.win32 : path.posix;
	}

	private getDirectoryPathFromFilePath(filePath: string): string {
		const pathModule = this.getPathModule(filePath);
		return pathModule.dirname(filePath);
	}

	async checkFileAccess(userId: string, filePath: string): Promise<boolean> {
		const directoryPath = this.getDirectoryPathFromFilePath(filePath);
		return this.checkDirectoryAccess(userId, directoryPath);
	}

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

		// ユーザーの権限をチェック - 動画のディレクトリが権限のあるディレクトリ配下にあるかチェック
		const permission = await this.prisma.permission.findFirst({
			where: {
				userId,
				canRead: true,
				directoryPath: {
					in: [
						// 完全一致
						directoryPath,
						// 親ディレクトリを全てチェック
						...this.getParentDirectories(directoryPath),
					],
				},
			},
		});

		// 権限が見つかった場合はOK
		if (permission) {
			return true;
		}

		return false;
	}

	/**
	 * ディレクトリパスの親ディレクトリを全て取得
	 * 例: /Users/akaaku/Movies/yt-dlp-data -> ["/Users/akaaku/Movies", "/Users/akaaku", "/Users", "/"]
	 */
	private getParentDirectories(directoryPath: string): string[] {
		const pathModule = this.getPathModule(directoryPath);
		const rootPath = pathModule.parse(directoryPath).root || pathModule.sep;
		const parents: string[] = [];
		let currentPath = directoryPath;

		while (currentPath !== rootPath) {
			currentPath = pathModule.dirname(currentPath);
			parents.push(currentPath);
		}

		return parents;
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
