"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Users,
	Folder,
	Plus,
	X,
	ChevronDown,
	ChevronRight,
	Shield,
	Home,
	UserCheck,
	UserX,
} from "lucide-react";
import { createApiUrl, AuthGuard, cn, AuthAPI } from "@maine/libs";

interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	isActive: boolean;
	permissions: Permission[];
	_count: {
		permissions: number;
	};
}

interface Permission {
	id: string;
	userId: string;
	directoryPath: string;
	canRead: boolean;
	user: {
		id: string;
		username: string;
		email: string;
	};
}

interface DirectoryNode {
	path: string;
	name: string;
	children: DirectoryNode[];
}

function PermissionsManagementContent() {
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [directories, setDirectories] = useState<DirectoryNode[]>([]);
	const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadingPermissions, setLoadingPermissions] = useState<Set<string>>(
		new Set(),
	);

	// データ取得
	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setIsLoading(true);
			const response = await fetch(createApiUrl("permissions/users"), {
				headers: AuthAPI.getAuthHeaders(),
			});
			if (!response.ok) throw new Error("データ取得に失敗しました");
			const data = await response.json();
			setUsers(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "エラーが発生しました");
		} finally {
			setIsLoading(false);
		}
	};

	// ディレクトリツリーの構築
	useEffect(() => {
		fetchAvailableDirectories();
	}, []); // ユーザー選択に依存しない

	const fetchAvailableDirectories = async () => {
		try {
			const response = await fetch(createApiUrl("videos/directories"), {
				headers: AuthAPI.getAuthHeaders(),
			});
			if (response.ok) {
				const dirs = await response.json();
				const tree = buildTree(dirs);
				setDirectories(tree);
			}
		} catch {
			// エラーの場合は基本的な構造を設定
			setDirectories([{ path: "/", name: "ルート", children: [] }]);
		}
	};

	const buildTree = (paths: string[]): DirectoryNode[] => {
		const root: DirectoryNode = { path: "/", name: "ルート", children: [] };
		const nodeMap = new Map<string, DirectoryNode>([["/", root]]);

		for (const path of paths.filter((p) => p?.startsWith("/"))) {
			const parts = path.split("/").filter(Boolean);
			let currentPath = "";
			let parent = root;

			for (const part of parts) {
				currentPath += `/${part}`;
				if (!nodeMap.has(currentPath)) {
					const node: DirectoryNode = {
						path: currentPath,
						name: part,
						children: [],
					};
					parent.children.push(node);
					nodeMap.set(currentPath, node);
				}
				parent = nodeMap.get(currentPath) || parent;
			}
		}

		return [root];
	};

	// 権限操作
	const togglePermission = async (userId: string, directoryPath: string) => {
		const permissionKey = `${userId}-${directoryPath}-canRead`;

		try {
			const currentPermission = selectedUser?.permissions.find(
				(p) => p.directoryPath === directoryPath,
			);
			const newCanRead = !currentPermission?.canRead;

			// ローディング状態を設定
			setLoadingPermissions((prev) => new Set(prev).add(permissionKey));

			// 楽観的UI更新 - API呼び出し前にローカル状態を更新
			if (selectedUser) {
				const updatedPermissions = currentPermission
					? selectedUser.permissions.map((p) =>
							p.directoryPath === directoryPath
								? { ...p, canRead: newCanRead }
								: p,
						)
					: [
							...selectedUser.permissions,
							{
								id: `temp-${Date.now()}`,
								userId,
								directoryPath,
								user: {
									id: userId,
									username: selectedUser.username,
									email: selectedUser.email,
								},
								canRead: newCanRead,
							},
						];

				setSelectedUser({
					...selectedUser,
					permissions: updatedPermissions,
				});

				// usersリストも更新
				setUsers((prevUsers) =>
					prevUsers.map((u) =>
						u.id === userId ? { ...u, permissions: updatedPermissions } : u,
					),
				);
			}

			const response = await fetch(
				createApiUrl(
					`permissions/${userId}/${encodeURIComponent(directoryPath)}`,
				),
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...AuthAPI.getAuthHeaders(),
					},
					body: JSON.stringify({ canRead: newCanRead }),
				},
			);

			if (!response.ok) {
				// API失敗時は元の状態に戻す
				setError("権限更新に失敗しました");
				fetchData(); // 最新の状態を再取得
				setLoadingPermissions((prev) => {
					const newSet = new Set(prev);
					newSet.delete(permissionKey);
					return newSet;
				});
				return;
			}

			// API成功時は正しい状態を再取得して確定
			fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "エラーが発生しました");
			// エラー時も最新の状態を再取得
			fetchData();
		} finally {
			// ローディング状態をクリア
			setLoadingPermissions((prev) => {
				const newSet = new Set(prev);
				newSet.delete(permissionKey);
				return newSet;
			});
		}
	};

	const removePermission = async (userId: string, directoryPath: string) => {
		try {
			// 楽観的UI更新 - API呼び出し前にローカル状態を更新
			if (selectedUser) {
				const updatedPermissions = selectedUser.permissions.filter(
					(p) => p.directoryPath !== directoryPath,
				);

				setSelectedUser({
					...selectedUser,
					permissions: updatedPermissions,
				});

				// usersリストも更新
				setUsers((prevUsers) =>
					prevUsers.map((u) =>
						u.id === userId ? { ...u, permissions: updatedPermissions } : u,
					),
				);
			}

			const response = await fetch(
				createApiUrl(
					`permissions/${userId}/${encodeURIComponent(directoryPath)}`,
				),
				{
					method: "DELETE",
					headers: AuthAPI.getAuthHeaders(),
				},
			);

			if (!response.ok) {
				// API失敗時は元の状態に戻す
				setError("権限削除に失敗しました");
				fetchData(); // 最新の状態を再取得
				return;
			}

			// API成功時は正しい状態を再取得して確定
			fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "エラーが発生しました");
			// エラー時も最新の状態を再取得
			fetchData();
		}
	};

	const grantPermission = async (userId: string, directoryPath: string) => {
		try {
			// 楽観的UI更新 - API呼び出し前にローカル状態を更新
			if (selectedUser) {
				const newPermission = {
					id: `temp-${Date.now()}`,
					userId,
					directoryPath,
					user: {
						id: userId,
						username: selectedUser.username,
						email: selectedUser.email,
					},
					canRead: true,
				};

				const updatedPermissions = [...selectedUser.permissions, newPermission];

				setSelectedUser({
					...selectedUser,
					permissions: updatedPermissions,
				});

				// usersリストも更新
				setUsers((prevUsers) =>
					prevUsers.map((u) =>
						u.id === userId ? { ...u, permissions: updatedPermissions } : u,
					),
				);
			}

			const response = await fetch(createApiUrl("permissions/grant"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...AuthAPI.getAuthHeaders(),
				},
				body: JSON.stringify({
					userId,
					directoryPath,
					canRead: true,
				}),
			});

			if (!response.ok) {
				// API失敗時は元の状態に戻す
				setError("権限付与に失敗しました");
				fetchData(); // 最新の状態を再取得
				return;
			}

			// API成功時は正しい状態を再取得して確定
			fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "エラーが発生しました");
			// エラー時も最新の状態を再取得
			fetchData();
		}
	};

	const toggleDirectory = (path: string) => {
		const newExpanded = new Set(expandedDirs);
		if (newExpanded.has(path)) {
			newExpanded.delete(path);
		} else {
			newExpanded.add(path);
		}
		setExpandedDirs(newExpanded);
	};

	const renderDirectoryNode = (node: DirectoryNode, level = 0) => {
		const isExpanded = expandedDirs.has(node.path);
		const hasPermission = selectedUser?.permissions.some(
			(p) => p.directoryPath === node.path,
		);
		const permission = selectedUser?.permissions.find(
			(p) => p.directoryPath === node.path,
		);

		return (
			<div key={node.path} className="select-none">
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 py-1 px-2 hover:bg-surface-elevated rounded cursor-pointer text-left w-full",
						level > 0 && "ml-4",
					)}
					onClick={() => toggleDirectory(node.path)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggleDirectory(node.path);
						}
					}}
				>
					{node.children.length > 0 && (
						<span className="text-muted-foreground">
							{isExpanded ? (
								<ChevronDown className="w-4 h-4" />
							) : (
								<ChevronRight className="w-4 h-4" />
							)}
						</span>
					)}
					<Folder
						className={cn(
							"w-4 h-4",
							hasPermission ? "text-primary" : "text-muted-foreground",
						)}
					/>
					<span
						className={cn(
							"text-sm",
							hasPermission
								? "text-foreground font-medium"
								: "text-muted-foreground",
						)}
					>
						{node.name}
					</span>
					<span className="text-xs text-muted-foreground ml-auto">
						{node.path}
					</span>
				</button>

				{isExpanded && (
					<div className="ml-6">
						{/* 権限設定 */}
						{selectedUser && (
							<div className="flex items-center gap-2 py-1 px-2 bg-surface rounded mb-1">
								<Shield className="w-4 h-4 text-primary" />
								<div className="flex items-center gap-2">
									<label className="flex items-center gap-1 text-xs">
										<input
											type="checkbox"
											checked={permission?.canRead || false}
											onChange={() =>
												togglePermission(selectedUser.id, node.path)
											}
											disabled={loadingPermissions.has(
												`${selectedUser.id}-${node.path}`,
											)}
											className={cn(
												"rounded",
												loadingPermissions.has(
													`${selectedUser.id}-${node.path}`,
												) && "opacity-50",
											)}
										/>
										読取
									</label>
									{hasPermission && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												removePermission(selectedUser.id, node.path);
											}}
											className="ml-2 text-destructive hover:text-destructive/80"
										>
											<X className="w-3 h-3" />
										</button>
									)}
									{!hasPermission && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												grantPermission(selectedUser.id, node.path);
											}}
											className="ml-2 text-success hover:text-success/80"
										>
											<Plus className="w-3 h-3" />
										</button>
									)}
								</div>
							</div>
						)}

						{/* 子ディレクトリ */}
						{node.children.map((child) =>
							renderDirectoryNode(child, level + 1),
						)}
					</div>
				)}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background-secondary flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background-secondary">
			{/* ヘッダー */}
			<div className="border-b border-border bg-surface">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Shield className="h-8 w-8 text-primary" />
							<div>
								<h1 className="text-2xl font-bold text-text-primary">
									権限管理
								</h1>
								<p className="text-text-secondary">
									ユーザーのディレクトリ読み取りアクセス権を管理
								</p>
							</div>
						</div>

						<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
							<button
								type="button"
								onClick={() => router.push("/")}
								className="p-1.5 sm:p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
								aria-label="ホーム"
							>
								<Home className="w-4 h-4 sm:w-5 sm:h-5" />
							</button>

							<button
								type="button"
								onClick={() => router.push("/scan")}
								className="p-1.5 sm:p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
								aria-label="スキャン"
							>
								<Folder className="w-4 h-4 sm:w-5 sm:h-5" />
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				{error && (
					<div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
						{error}
						<button
							type="button"
							onClick={() => setError(null)}
							className="ml-2 text-destructive underline"
						>
							閉じる
						</button>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* ユーザーリスト */}
					<div className="lg:col-span-1">
						<div className="bg-surface rounded-lg border border-border p-6">
							<h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
								<Users className="h-5 w-5" />
								ユーザー一覧
							</h2>

							<div className="space-y-2">
								{users.map((user) => (
									<button
										type="button"
										key={user.id}
										onClick={() => setSelectedUser(user)}
										className={cn(
											"p-3 rounded-lg border cursor-pointer transition-colors text-left w-full",
											selectedUser?.id === user.id
												? "border-primary bg-primary/5"
												: "border-border hover:bg-surface-elevated",
										)}
									>
										<div className="flex items-center justify-between">
											<div>
												<div className="font-medium text-text-primary">
													{user.username}
												</div>
												<div className="text-sm text-text-secondary">
													{user.email}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<span
													className={cn(
														"px-2 py-1 text-xs rounded",
														user.role === "ADMIN"
															? "bg-primary/10 text-primary"
															: "bg-muted text-muted-foreground",
													)}
												>
													{user.role}
												</span>
												{user.isActive ? (
													<UserCheck className="w-4 h-4 text-success" />
												) : (
													<UserX className="w-4 h-4 text-destructive" />
												)}
											</div>
										</div>
										<div className="text-xs text-muted-foreground mt-2">
											{user._count.permissions}個の権限設定
										</div>
									</button>
								))}
							</div>
						</div>
					</div>

					{/* 権限設定 */}
					<div className="lg:col-span-2">
						{selectedUser ? (
							<div className="bg-surface rounded-lg border border-border p-6">
								<h2 className="text-lg font-semibold text-text-primary mb-4">
									{selectedUser.username} の権限設定
								</h2>

								<div className="mb-4">
									<div className="text-sm text-text-secondary mb-2">
										チェックを入れて読み取り権限を設定してください
									</div>
									<div className="text-xs text-muted-foreground">
										• 読取権限: ディレクトリ内の動画ファイル一覧表示
										<br />• 管理者は全てのディレクトリにアクセス可能
									</div>
								</div>

								<div className="border border-border rounded-md p-4 max-h-96 overflow-y-auto">
									{directories.length > 0 ? (
										directories.map((dir) => renderDirectoryNode(dir))
									) : (
										<div className="text-center text-muted-foreground py-8">
											<Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
											<p>ディレクトリ情報がありません</p>
										</div>
									)}
								</div>

								{/* 既存権限のリスト */}
								{selectedUser.permissions.length > 0 && (
									<div className="mt-6">
										<h3 className="font-medium text-text-primary mb-3">
											現在の権限
										</h3>
										<div className="space-y-2">
											{selectedUser.permissions.map((permission) => (
												<div
													key={permission.id}
													className="flex items-center justify-between p-3 bg-surface-elevated rounded-md"
												>
													<div>
														<div className="font-medium text-text-primary">
															{permission.directoryPath}
														</div>
														<div className="text-sm text-text-secondary">
															{permission.canRead ? "読取可能" : "権限なし"}
														</div>
													</div>
													<button
														type="button"
														onClick={() =>
															removePermission(
																selectedUser.id,
																permission.directoryPath,
															)
														}
														className="text-destructive hover:text-destructive/80 p-1"
													>
														<X className="w-4 h-4" />
													</button>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="bg-surface rounded-lg border border-border p-6">
								<div className="text-center text-muted-foreground py-12">
									<Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
									<p className="text-lg">ユーザーを選択してください</p>
									<p className="text-sm">
										左側のユーザーリストから権限を設定したいユーザーを選択します
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * 管理者専用権限管理ページ
 */
export default function PermissionsManagementPage() {
	const router = useRouter();

	return (
		<AuthGuard
			requireAdmin={true}
			onRedirect={(path) => {
				if (path) {
					router.push(path);
				}
			}}
		>
			<PermissionsManagementContent />
		</AuthGuard>
	);
}
