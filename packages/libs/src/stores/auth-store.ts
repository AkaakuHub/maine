import React from "react";
import { AuthAPI, type UserProfile } from "../api/auth";

// グローバルな状態管理
const authState: {
	user: UserProfile | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: string | null;
	userExists: boolean | null; // null = 未チェック
	listeners: Array<() => void>;
} = {
	user: null,
	isLoading: false,
	isAuthenticated: false,
	error: null,
	userExists: null,
	listeners: [],
};

// 状態変更通知
function notifyListeners() {
	for (const listener of authState.listeners) {
		listener();
	}
}

// localStorage操作
const STORAGE_KEY = "auth-storage";

function saveToStorage() {
	if (typeof window !== "undefined") {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				user: authState.user,
				isAuthenticated: authState.isAuthenticated,
			}),
		);
	}
}

function loadFromStorage() {
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const data = JSON.parse(stored);
				authState.user = data.user;
				authState.isAuthenticated = data.isAuthenticated;
			} catch {
				// 無視
			}
		}
	}
}

// 初期化
loadFromStorage();

export const useAuthStore = () => {
	// ReactのuseStateで状態を追跡
	const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

	React.useEffect(() => {
		// リスナー登録
		authState.listeners.push(forceUpdate);
		return () => {
			authState.listeners = authState.listeners.filter(
				(listener) => listener !== forceUpdate,
			);
		};
	}, []);

	return {
		// 状態ゲッター
		user: authState.user,
		isLoading: authState.isLoading,
		isAuthenticated: authState.isAuthenticated,
		error: authState.error,
		userExists: authState.userExists,

		// アクション
		login: async (username: string, password: string) => {
			authState.isLoading = true;
			authState.error = null;
			notifyListeners();

			try {
				const response = await AuthAPI.login({ username, password });
				authState.user = response.user;
				authState.isAuthenticated = true;
				authState.isLoading = false;
				authState.error = null;
				saveToStorage();
				notifyListeners();
			} catch (error) {
				authState.error =
					error instanceof Error ? error.message : "ログインに失敗しました";
				authState.isLoading = false;
				authState.isAuthenticated = false;
				authState.user = null;
				notifyListeners();
				throw error;
			}
		},

		registerFirstUser: async (username: string, password: string) => {
			authState.isLoading = true;
			authState.error = null;
			notifyListeners();

			try {
				const response = await AuthAPI.registerFirstUser({
					username,
					password,
				});
				authState.user = response.user;
				authState.isAuthenticated = true;
				authState.isLoading = false;
				authState.error = null;
				saveToStorage();
				notifyListeners();
			} catch (error) {
				authState.error =
					error instanceof Error ? error.message : "管理者登録に失敗しました";
				authState.isLoading = false;
				authState.isAuthenticated = false;
				authState.user = null;
				notifyListeners();
				throw error;
			}
		},

		register: async (username: string, email: string, password: string) => {
			authState.isLoading = true;
			authState.error = null;
			notifyListeners();

			try {
				const response = await AuthAPI.register({
					username,
					email,
					password,
				});
				authState.user = response.user;
				authState.isAuthenticated = true;
				authState.isLoading = false;
				authState.error = null;
				saveToStorage();
				notifyListeners();
			} catch (error) {
				authState.error =
					error instanceof Error ? error.message : "ユーザー登録に失敗しました";
				authState.isLoading = false;
				authState.isAuthenticated = false;
				authState.user = null;
				notifyListeners();
				throw error;
			}
		},

		logout: () => {
			AuthAPI.logout();
			authState.user = null;
			authState.isAuthenticated = false;
			authState.error = null;
			authState.isLoading = false;
			authState.userExists = null;
			if (typeof window !== "undefined") {
				localStorage.removeItem(STORAGE_KEY);
			}
			notifyListeners();
		},

		setUser: (user: UserProfile | null) => {
			authState.user = user;
			authState.isAuthenticated = !!user;
			saveToStorage();
			notifyListeners();
		},

		checkAuth: async () => {
			if (!AuthAPI.isAuthenticated()) {
				authState.user = null;
				authState.isAuthenticated = false;
				authState.isLoading = false;
				notifyListeners();
				return;
			}

			authState.isLoading = true;
			notifyListeners();

			try {
				// 新しいvalidateToken APIを使用してユーザー情報も同時に取得
				const response = await AuthAPI.validateToken();
				if (response.valid) {
					authState.user = response.user;
					authState.isAuthenticated = true;
					authState.isLoading = false;
					authState.error = null;
					saveToStorage();
					notifyListeners();
				} else {
					authState.user = null;
					authState.isAuthenticated = false;
					authState.isLoading = false;
					authState.error = null;
					notifyListeners();
				}
			} catch (_error) {
				authState.user = null;
				authState.isAuthenticated = false;
				authState.isLoading = false;
				authState.error = null;
				notifyListeners();
			}
		},

		checkUserExists: async (): Promise<boolean> => {
			if (!AuthAPI.isAuthenticated()) {
				authState.userExists = false;
				notifyListeners();
				return false;
			}

			try {
				const response = await AuthAPI.checkUserExists();
				authState.userExists = response.exists;
				notifyListeners();
				return response.exists;
			} catch (_error) {
				// エラーの場合は存在しないとみなす
				authState.userExists = false;
				notifyListeners();
				return false;
			}
		},

		clearError: () => {
			authState.error = null;
			notifyListeners();
		},
	};
};
