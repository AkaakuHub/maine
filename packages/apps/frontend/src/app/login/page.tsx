"use client";

import { AuthAPI, AuthGuard, useAuthStore } from "@maine/libs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function LoginContent() {
	const router = useRouter();
	const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
	const [isLoadingCheck, setIsLoadingCheck] = useState(true);
	const [isLogin, setIsLogin] = useState(true);
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
	});

	const { login, register, registerFirstUser, isLoading, error, clearError } =
		useAuthStore();

	// 初回ユーザーチェック
	useEffect(() => {
		const checkFirstUser = async () => {
			try {
				const result = await AuthAPI.checkFirstUser();
				setIsFirstUser(result.isFirstUser);
				// 初回アクセスの場合は登録モードにする
				if (result.isFirstUser) {
					setIsLogin(false);
				}

				// DB準備ができていない場合のメッセージ表示
				if (!result.databaseReady) {
					console.warn("Database not ready:", result.message);
				}
			} catch (error) {
				console.error("初回ユーザーチェック失敗:", error);
				// エラーの場合は通常のログイン表示
				setIsFirstUser(false);
			} finally {
				setIsLoadingCheck(false);
			}
		};

		checkFirstUser();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		clearError();

		try {
			if (isLogin) {
				await login(formData.username, formData.password);
			} else {
				// 初回ユーザー登録か一般ユーザー登録か判定
				if (isFirstUser) {
					await registerFirstUser(formData.username, formData.password);
				} else {
					await register(formData.username, formData.email, formData.password);
				}
			}
			router.push("/");
		} catch {
			// エラーはstoreで処理済み
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		clearError();
		setFormData({
			username: "",
			email: "",
			password: "",
		});
	};

	// ローディング中
	if (isLoadingCheck) {
		return (
			<div className="min-h-screen bg-surface-variant flex items-center justify-center p-4">
				<div className="w-full max-w-md">
					<div className="bg-surface rounded-lg shadow-lg border border-border p-8">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
							<p className="text-muted-foreground">読み込み中...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface-variant flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="bg-surface rounded-lg shadow-lg border border-border p-8">
					{/* ヘッダー */}
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-foreground mb-2">Maine</h1>
						<p className="text-muted-foreground">
							動画ストリーミングプラットフォーム
						</p>
						{isFirstUser && (
							<div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
								<p className="text-sm text-primary font-medium">
									初回アクセスのため、管理者アカウントを作成します
								</p>
							</div>
						)}
					</div>

					{/* フォーム */}
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* ユーザー名 */}
						<div>
							<label
								htmlFor="username"
								className="block text-sm font-medium text-foreground mb-2"
							>
								ユーザー名
							</label>
							<input
								id="username"
								name="username"
								type="text"
								required
								value={formData.username}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								placeholder="ユーザー名を入力"
							/>
						</div>

						{/* メールアドレス（一般ユーザー登録時のみ） */}
						{!isLogin && !isFirstUser && (
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-foreground mb-2"
								>
									メールアドレス
								</label>
								<input
									id="email"
									name="email"
									type="email"
									required
									value={formData.email}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
									placeholder="メールアドレスを入力"
								/>
							</div>
						)}

						{/* パスワード */}
						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-foreground mb-2"
							>
								パスワード
							</label>
							<input
								id="password"
								name="password"
								type="password"
								required
								value={formData.password}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								placeholder="パスワードを入力"
								minLength={6}
							/>
						</div>

						{/* エラーメッセージ */}
						{error && (
							<div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
								{error}
							</div>
						)}

						{/* 送信ボタン */}
						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isLoading
								? "処理中..."
								: isLogin
									? "ログイン"
									: isFirstUser
										? "管理者として登録"
										: "登録"}
						</button>
					</form>

					{/* モード切替（初回アクセス以外で表示） */}
					{!isFirstUser && (
						<div className="mt-6 text-center">
							<p className="text-sm text-muted-foreground">
								{isLogin
									? "アカウントをお持ちでないですか？"
									: "既にアカウントをお持ちですか？"}
								<button
									type="button"
									onClick={toggleMode}
									className="ml-1 text-primary hover:underline focus:outline-none"
								>
									{isLogin ? "登録する" : "ログイン"}
								</button>
							</p>
						</div>
					)}

					{/* 初回アクセス時の説明 */}
					{isFirstUser && (
						<div className="mt-6 p-4 bg-muted rounded-md">
							<p className="text-xs text-muted-foreground mb-2">
								<strong>管理者アカウント作成:</strong>
							</p>
							<ul className="text-xs text-muted-foreground space-y-1">
								<li>
									•
									入力したユーザー名とパスワードで管理者アカウントが作成されます
								</li>
								<li>• メールアドレスは自動的に生成されます</li>
								<li>• 全てのディレクトリへのアクセス権が付与されます</li>
								<li>• 以降のユーザー登録は一般ユーザーとして扱われます</li>
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	const router = useRouter();

	return (
		<AuthGuard
			requireAuth={false}
			onRedirect={(path) => {
				if (path) {
					router.push(path);
				}
			}}
		>
			<LoginContent />
		</AuthGuard>
	);
}
