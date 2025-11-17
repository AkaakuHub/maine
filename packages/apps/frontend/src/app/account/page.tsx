"use client";

import {
	AccountAPI,
	AuthGuard,
	type AccountProfile,
	useAuthStore,
} from "@maine/libs";
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	KeyRound,
	Loader2,
	LogOut,
	Mail,
	RefreshCcw,
	Shield,
	UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const formatDateTime = (value?: string | null) => {
	if (!value) return "-";
	try {
		return new Intl.DateTimeFormat("ja-JP", {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(value));
	} catch {
		return value;
	}
};

function AccountContent() {
	const router = useRouter();
	const { user, logout, setUser } = useAuthStore();
	const [profile, setProfile] = useState<AccountProfile | null>(null);
	const [isLoadingProfile, setIsLoadingProfile] = useState(true);
	const [initialError, setInitialError] = useState<string | null>(null);
	const [profileForm, setProfileForm] = useState({ username: "", email: "" });
	const [profileSaving, setProfileSaving] = useState(false);
	const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	const loadProfile = useCallback(async () => {
		setIsLoadingProfile(true);
		setInitialError(null);
		try {
			const data = await AccountAPI.getProfile();
			setProfile(data);
			setProfileForm({
				username: data.username,
				email: data.email ?? "",
			});
		} catch (error) {
			setInitialError(
				error instanceof Error
					? error.message
					: "プロフィールの取得に失敗しました",
			);
		} finally {
			setIsLoadingProfile(false);
		}
	}, []);

	useEffect(() => {
		void loadProfile();
	}, [loadProfile]);

	const handleProfileChange = (field: "username" | "email", value: string) => {
		setProfileForm((prev) => ({ ...prev, [field]: value }));
		setProfileSuccess(null);
		setProfileError(null);
	};

	const handlePasswordChange = (
		field: "currentPassword" | "newPassword" | "confirmPassword",
		value: string,
	) => {
		setPasswordForm((prev) => ({ ...prev, [field]: value }));
		setPasswordSuccess(null);
		setPasswordError(null);
	};

	const handleProfileSubmit = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		if (!profile) return;
		const payload: { username?: string; email?: string } = {};
		if (profileForm.username && profileForm.username !== profile.username) {
			payload.username = profileForm.username.trim();
		}
		const emailValue = profileForm.email.trim();
		const currentEmail = profile.email ?? "";
		if (emailValue && emailValue !== currentEmail) {
			payload.email = emailValue;
		}

		if (Object.keys(payload).length === 0) {
			setProfileSuccess("変更内容がありません");
			setProfileError(null);
			return;
		}

		setProfileSaving(true);
		setProfileSuccess(null);
		setProfileError(null);
		try {
			const updated = await AccountAPI.updateProfile(payload);
			setProfile(updated);
			setProfileForm({
				username: updated.username,
				email: updated.email ?? "",
			});
			setProfileSuccess("プロフィールを更新しました");
			setUser(updated);
		} catch (error) {
			setProfileError(
				error instanceof Error
					? error.message
					: "プロフィールの更新に失敗しました",
			);
		} finally {
			setProfileSaving(false);
		}
	};

	const handlePasswordSubmit = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setPasswordError("新しいパスワードが一致しません");
			return;
		}
		if (passwordForm.currentPassword === passwordForm.newPassword) {
			setPasswordError("現在と異なるパスワードを設定してください");
			return;
		}

		const usernameForUpdate = profile?.username ?? user?.username;
		if (!usernameForUpdate) {
			setPasswordError("ユーザー情報の取得に失敗しました");
			return;
		}

		setPasswordSaving(true);
		setPasswordSuccess(null);
		setPasswordError(null);

		try {
			await AccountAPI.updatePassword({
				username: usernameForUpdate,
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword,
			});
			setPasswordSuccess("パスワードを更新しました");
			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (error) {
			setPasswordError(
				error instanceof Error
					? error.message
					: "パスワードの更新に失敗しました",
			);
		} finally {
			setPasswordSaving(false);
		}
	};

	const accountMeta = useMemo(() => {
		const isActive = profile?.isActive ?? user?.isActive ?? false;
		return [
			{
				label: "ユーザー名",
				value: profile?.username ?? user?.username ?? "-",
			},
			{ label: "メールアドレス", value: profile?.email ?? user?.email ?? "-" },
			{ label: "ロール", value: profile?.role ?? user?.role ?? "-" },
			{
				label: "ステータス",
				value: isActive ? "有効" : "無効",
			},
			{ label: "作成日時", value: formatDateTime(profile?.createdAt) },
			{ label: "最終更新", value: formatDateTime(profile?.updatedAt) },
		];
	}, [profile, user]);

	if (isLoadingProfile) {
		return (
			<div className="min-h-screen bg-surface-variant flex items-center justify-center">
				<div className="flex flex-col items-center gap-3 text-text-secondary">
					<Loader2 className="w-6 h-6 animate-spin" />
					<span>プロフィールを読み込み中...</span>
				</div>
			</div>
		);
	}

	if (initialError) {
		return (
			<div className="min-h-screen bg-surface-variant flex items-center justify-center px-4">
				<div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 text-center">
					<AlertTriangle className="w-10 h-10 text-error mx-auto mb-4" />
					<p className="text-text font-medium mb-4">{initialError}</p>
					<button
						type="button"
						onClick={() => loadProfile()}
						className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
					>
						<RefreshCcw className="w-4 h-4" /> 再試行
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface-variant py-10">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={() => router.push("/")}
						className="inline-flex items-center gap-2 text-text-secondary hover:text-text transition-colors"
					>
						<ArrowLeft className="w-4 h-4" />
						ホームへ戻る
					</button>
					<button
						type="button"
						onClick={() => loadProfile()}
						className="inline-flex items-center gap-2 text-text-secondary hover:text-text"
						aria-label="最新の情報に更新"
					>
						<RefreshCcw className="w-4 h-4" />
						再読み込み
					</button>
				</div>

				<div className="space-y-2">
					<h1 className="text-2xl font-semibold text-text">マイページ</h1>
					<p className="text-text-secondary">
						アカウント情報の確認とメールアドレス・パスワードの変更ができます。
					</p>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					<section className="lg:col-span-1 bg-surface border border-border rounded-2xl p-5 space-y-5 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="p-3 rounded-xl bg-primary/10 text-primary">
								<UserRound className="w-6 h-6" />
							</div>
							<div>
								<p className="text-sm text-text-secondary">
									ログイン中のユーザー
								</p>
								<p className="text-lg font-semibold text-text">
									{profile?.username ?? user?.username}
								</p>
							</div>
						</div>

						<dl className="space-y-3">
							{accountMeta.map((item) => (
								<div key={item.label}>
									<dt className="text-xs text-text-secondary uppercase tracking-wide">
										{item.label}
									</dt>
									<dd className="text-sm text-text font-medium">
										{item.value}
									</dd>
								</div>
							))}
						</dl>

						<div className="pt-4 border-t border-border space-y-3">
							<button
								type="button"
								onClick={() => router.push("/admin/permissions")}
								disabled={user?.role !== "ADMIN"}
								className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-surface-elevated disabled:opacity-50"
							>
								<Shield className="w-4 h-4" />
								権限管理へ
							</button>
							<button
								type="button"
								onClick={() => logout()}
								className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-error text-text-inverse hover:bg-error-hover text-sm"
							>
								<LogOut className="w-4 h-4" />
								ログアウト
							</button>
						</div>
					</section>

					<section className="lg:col-span-2 space-y-6">
						<form
							onSubmit={handleProfileSubmit}
							className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5"
						>
							<div className="flex items-center gap-3">
								<div className="p-3 rounded-xl bg-primary/10 text-primary">
									<Mail className="w-5 h-5" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-text">
										プロフィール設定
									</h2>
									<p className="text-sm text-text-secondary">
										ユーザー名とメールアドレスを更新します。
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="account-username"
										className="block text-sm font-medium text-text mb-1"
									>
										ユーザー名
									</label>
									<input
										id="account-username"
										type="text"
										value={profileForm.username}
										onChange={(event) =>
											handleProfileChange("username", event.target.value)
										}
										className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-text focus:outline-none focus:ring-2 focus:ring-primary"
										required
										minLength={3}
										maxLength={32}
									/>
								</div>
								<div>
									<label
										htmlFor="account-email"
										className="block text-sm font-medium text-text mb-1"
									>
										メールアドレス
									</label>
									<input
										id="account-email"
										type="email"
										value={profileForm.email}
										onChange={(event) =>
											handleProfileChange("email", event.target.value)
										}
										className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-text focus:outline-none focus:ring-2 focus:ring-primary"
										title="有効なメールアドレスを入力してください"
										autoComplete="email"
									/>
								</div>
							</div>

							{profileError && (
								<div className="flex items-center gap-2 text-error text-sm bg-error/10 border border-error rounded-lg px-3 py-2">
									<AlertTriangle className="w-4 h-4" />
									<span>{profileError}</span>
								</div>
							)}
							{profileSuccess && (
								<div className="flex items-center gap-2 text-success text-sm bg-success-bg/40 border border-success rounded-lg px-3 py-2">
									<CheckCircle2 className="w-4 h-4" />
									<span>{profileSuccess}</span>
								</div>
							)}

							<div className="flex justify-end">
								<button
									type="submit"
									disabled={profileSaving}
									className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover disabled:opacity-50"
								>
									{profileSaving && (
										<Loader2 className="w-4 h-4 animate-spin" />
									)}
									変更を保存
								</button>
							</div>
						</form>

						<form
							onSubmit={handlePasswordSubmit}
							className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5"
						>
							<div className="flex items-center gap-3">
								<div className="p-3 rounded-xl bg-primary/10 text-primary">
									<KeyRound className="w-5 h-5" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-text">
										パスワード変更
									</h2>
									<p className="text-sm text-text-secondary">
										現在のパスワードを入力し、新しいパスワードを設定してください。
									</p>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="md:col-span-2">
									<label
										htmlFor="current-password"
										className="block text-sm font-medium text-text mb-1"
									>
										現在のパスワード
									</label>
									<input
										id="current-password"
										type="password"
										value={passwordForm.currentPassword}
										onChange={(event) =>
											handlePasswordChange(
												"currentPassword",
												event.target.value,
											)
										}
										className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-text focus:outline-none focus:ring-2 focus:ring-primary"
										required
										autoComplete="current-password"
									/>
								</div>
								<div>
									<label
										htmlFor="new-password"
										className="block text-sm font-medium text-text mb-1"
									>
										新しいパスワード
									</label>
									<input
										id="new-password"
										type="password"
										value={passwordForm.newPassword}
										onChange={(event) =>
											handlePasswordChange("newPassword", event.target.value)
										}
										className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-text focus:outline-none focus:ring-2 focus:ring-primary"
										required
										minLength={8}
										autoComplete="new-password"
									/>
								</div>
								<div>
									<label
										htmlFor="new-password-confirm"
										className="block text-sm font-medium text-text mb-1"
									>
										新しいパスワード（確認）
									</label>
									<input
										id="new-password-confirm"
										type="password"
										value={passwordForm.confirmPassword}
										onChange={(event) =>
											handlePasswordChange(
												"confirmPassword",
												event.target.value,
											)
										}
										className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-text focus:outline-none focus:ring-2 focus:ring-primary"
										required
										minLength={8}
										autoComplete="new-password"
									/>
								</div>
							</div>

							{passwordError && (
								<div className="flex items-center gap-2 text-error text-sm bg-error/10 border border-error rounded-lg px-3 py-2">
									<AlertTriangle className="w-4 h-4" />
									<span>{passwordError}</span>
								</div>
							)}
							{passwordSuccess && (
								<div className="flex items-center gap-2 text-success text-sm bg-success-bg/40 border border-success rounded-lg px-3 py-2">
									<CheckCircle2 className="w-4 h-4" />
									<span>{passwordSuccess}</span>
								</div>
							)}

							<div className="flex justify-end">
								<button
									type="submit"
									disabled={passwordSaving}
									className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover disabled:opacity-50"
								>
									{passwordSaving && (
										<Loader2 className="w-4 h-4 animate-spin" />
									)}
									パスワードを更新
								</button>
							</div>
						</form>
					</section>
				</div>
			</div>
		</div>
	);
}

function AccountPage() {
	const router = useRouter();
	return (
		<AuthGuard
			onRedirect={(path) => {
				if (path) {
					router.push(path);
				}
			}}
		>
			<Suspense fallback={<div className="min-h-screen bg-surface-variant" />}>
				<AccountContent />
			</Suspense>
		</AuthGuard>
	);
}

export default AccountPage;
