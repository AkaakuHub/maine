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

interface LoginChallenge {
	challenge: string;
	challengeToken: string;
	salt: string;
	iterations: number;
	keyLength: number;
	digest: string;
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

const textEncoder = new TextEncoder();

const hexToArrayBuffer = (hex: string): ArrayBuffer => {
	const length = hex.length / 2;
	const buffer = new Uint8Array(length);
	for (let i = 0; i < length; i += 1) {
		buffer[i] = Number.parseInt(hex.substr(i * 2, 2), 16);
	}
	return buffer.buffer;
};

const arrayBufferToHex = (buffer: ArrayBuffer): string => {
	const byteArray = new Uint8Array(buffer);
	let hex = "";
	for (const byte of byteArray) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
};

const ensureCrypto = () => {
	if (typeof window === "undefined" || !window.crypto?.subtle) {
		throw new Error("このブラウザは安全な暗号処理に対応していません");
	}
};

async function deriveVerifier(
	password: string,
	saltHex: string,
	iterations: number,
	keyLength: number,
	digest: string,
): Promise<string> {
	ensureCrypto();
	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		textEncoder.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"],
	);
	const derivedBits = await window.crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: hexToArrayBuffer(saltHex),
			iterations,
			hash: digest,
		},
		keyMaterial,
		keyLength * 8,
	);
	return arrayBufferToHex(derivedBits);
}

async function computeChallengeResponseClient(
	verifierHex: string,
	challenge: string,
): Promise<string> {
	ensureCrypto();
	const data = textEncoder.encode(`${verifierHex}:${challenge}`);
	const hash = await window.crypto.subtle.digest("SHA-256", data);
	return arrayBufferToHex(hash);
}

async function extractErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	try {
		const data = await response.json();
		if (typeof data.message === "string") {
			return data.message;
		}
		if (Array.isArray(data.message)) {
			return data.message.join("\n");
		}
		return fallback;
	} catch {
		const text = await response.text();
		return text || fallback;
	}
}

async function requestLoginChallenge(
	username: string,
): Promise<LoginChallenge> {
	const response = await fetch(createApiUrl("auth/challenge"), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ username }),
	});

	if (!response.ok) {
		throw new Error(
			await extractErrorMessage(response, "チャレンジの取得に失敗しました"),
		);
	}

	return response.json();
}

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
		const challenge = await requestLoginChallenge(credentials.username);
		const verifier = await deriveVerifier(
			credentials.password,
			challenge.salt,
			challenge.iterations,
			challenge.keyLength,
			challenge.digest,
		);
		const signature = await computeChallengeResponseClient(
			verifier,
			challenge.challenge,
		);

		const response = await fetch(createApiUrl("auth/login"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: credentials.username,
				challengeToken: challenge.challengeToken,
				response: signature,
			}),
		});

		if (!response.ok) {
			throw new Error(
				await extractErrorMessage(response, "ログインに失敗しました"),
			);
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
			throw new Error(
				await extractErrorMessage(response, "管理者登録に失敗しました"),
			);
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
			throw new Error(
				await extractErrorMessage(response, "ユーザー登録に失敗しました"),
			);
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

		return response.json() as Promise<UserProfile>;
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

	// ユーザー存在チェックAPI
	async checkUserExists(): Promise<{
		exists: boolean;
		userId: string;
	}> {
		const response = await fetch(createApiUrl("auth/check-user-exists"), {
			headers: this.getAuthHeaders(),
		});

		if (!response.ok) {
			throw new Error("ユーザー存在チェックに失敗しました");
		}

		return response.json();
	},

	async requestChallenge(username: string): Promise<LoginChallenge> {
		return requestLoginChallenge(username);
	},
};
