import { createApiUrl } from "../utils/api";

interface LoginCredentials {
	username: string;
	password: string;
}

interface RegisterData {
	username: string;
	email: string;
	password: string;
}

interface FirstUserData {
	username: string;
	password: string;
}

interface AuthResponse {
	access_token: string;
	user: UserProfile;
}

export interface UserProfile {
	userId: string;
	id: string;
	username: string;
	email: string;
	role: string;
	isActive: boolean;
}

const getToken = (): string | null => {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("access_token");
};

const setToken = (token: string): void => {
	if (typeof window === "undefined") return;
	localStorage.setItem("access_token", token);
};

const removeToken = (): void => {
	if (typeof window === "undefined") return;
	localStorage.removeItem("access_token");
};

export const AuthAPI = {
	getAuthHeaders(): Record<string, string> {
		const token = getToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	},

	async checkFirstUser(): Promise<{
		isFirstUser: boolean;
		databaseReady: boolean;
		message: string;
	}> {
		const response = await fetch(createApiUrl("auth/check-first-user"));
		if (!response.ok) {
			throw new Error("初回ユーザーチェックに失敗しました");
		}
		return response.json();
	},

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		const response = await fetch(createApiUrl("auth/login"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(credentials),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(error || "ログインに失敗しました");
		}

		const data: AuthResponse = await response.json();
		setToken(data.access_token);
		return data;
	},

	async registerFirstUser(userData: FirstUserData): Promise<AuthResponse> {
		const response = await fetch(createApiUrl("auth/first-user"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(userData),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(error || "管理者登録に失敗しました");
		}

		const data: AuthResponse = await response.json();
		setToken(data.access_token);
		return data;
	},

	async register(userData: RegisterData): Promise<AuthResponse> {
		const response = await fetch(createApiUrl("auth/register"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(userData),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(error || "ユーザー登録に失敗しました");
		}

		const data: AuthResponse = await response.json();
		setToken(data.access_token);
		return data;
	},

	async getProfile(): Promise<UserProfile> {
		const response = await fetch(createApiUrl("auth/profile"), {
			headers: this.getAuthHeaders(),
		});

		if (!response.ok) {
			throw new Error("プロフィールの取得に失敗しました");
		}

		return response.json();
	},

	logout(): void {
		removeToken();
		window.location.href = "/login";
	},

	isAuthenticated(): boolean {
		return !!getToken();
	},

	async checkAuth(): Promise<boolean> {
		try {
			// 新しいトークン検証APIを使用
			await this.validateToken();
			return true;
		} catch {
			removeToken();
			return false;
		}
	},

	// 新しいトークン検証API
	async validateToken(): Promise<{ valid: boolean; user: UserProfile }> {
		const response = await fetch(createApiUrl("auth/validate"), {
			headers: this.getAuthHeaders(),
		});

		if (!response.ok) {
			// 401エラー（トークン無効）の場合は自動的にログアウト
			if (response.status === 401) {
				removeToken();
				window.location.href = "/login";
			}
			throw new Error("トークンの検証に失敗しました");
		}

		return response.json();
	},
};
