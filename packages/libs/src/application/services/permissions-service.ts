import { getAppRuntime } from "../runtime";

interface PermissionUserSummary {
	id: string;
	username: string;
	email: string;
}

interface PermissionRecord {
	id: string;
	userId: string;
	directoryPath: string;
	canRead: boolean;
	user: PermissionUserSummary;
}

export interface PermissionManagedUser {
	id: string;
	username: string;
	email: string;
	role: string;
	isActive: boolean;
	permissions: PermissionRecord[];
	_count: {
		permissions: number;
	};
}

export async function fetchUsersWithPermissions(): Promise<
	PermissionManagedUser[]
> {
	return getAppRuntime().http.requestJson<PermissionManagedUser[]>({
		path: "permissions/users",
		requiresAuth: true,
		errorMessage: "権限一覧の取得に失敗しました",
	});
}

export async function fetchVideoDirectories(): Promise<string[]> {
	return getAppRuntime().http.requestJson<string[]>({
		path: "videos/directories",
		requiresAuth: true,
		errorMessage: "ディレクトリ一覧の取得に失敗しました",
	});
}

export async function grantDirectoryPermission(input: {
	userId: string;
	directoryPath: string;
	canRead: boolean;
}): Promise<void> {
	await getAppRuntime().http.requestJson<unknown>({
		path: "permissions/grant",
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(input),
		},
		requiresAuth: true,
		errorMessage: "権限付与に失敗しました",
	});
}

export async function updateDirectoryPermission(
	userId: string,
	directoryPath: string,
	input: {
		canRead: boolean;
	},
): Promise<void> {
	await getAppRuntime().http.requestJson<unknown>({
		path: `permissions/${userId}/${encodeURIComponent(directoryPath)}`,
		init: {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(input),
		},
		requiresAuth: true,
		errorMessage: "権限更新に失敗しました",
	});
}

export async function revokeDirectoryPermission(
	userId: string,
	directoryPath: string,
): Promise<void> {
	await getAppRuntime().http.requestJson<unknown>({
		path: `permissions/${userId}/${encodeURIComponent(directoryPath)}`,
		init: {
			method: "DELETE",
		},
		requiresAuth: true,
		errorMessage: "権限削除に失敗しました",
	});
}
