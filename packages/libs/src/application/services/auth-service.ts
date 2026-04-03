import { getAppRuntime } from "../runtime";
import type {
	AuthResponse,
	FirstUserData,
	LoginChallenge,
	LoginCredentials,
	RegisterData,
	UserProfile,
} from "../../domain/auth/models";
export type {
	AuthResponse,
	FirstUserData,
	LoginChallenge,
	LoginCredentials,
	RegisterData,
	UserProfile,
};

interface ValidateTokenResponse {
	valid: boolean;
	user: UserProfile;
}

interface CheckFirstUserResponse {
	isFirstUser: boolean;
	databaseReady: boolean;
	message: string;
}

interface CheckUserExistsResponse {
	exists: boolean;
	userId: string;
}

function setAccessToken(token: string): void {
	getAppRuntime().tokenStorage.setAccessToken(token);
}

function removeAccessToken(): void {
	getAppRuntime().tokenStorage.removeAccessToken();
}

export function getAccessToken(): string | null {
	return getAppRuntime().tokenStorage.getAccessToken();
}

export function clearAuthentication(): void {
	removeAccessToken();
}

export function redirectToLogin(): void {
	getAppRuntime().navigation.goToLogin();
}

export async function requestLoginChallenge(
	username: string,
): Promise<LoginChallenge> {
	return getAppRuntime().http.requestJson<LoginChallenge>({
		path: "auth/challenge",
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ username }),
		},
		errorMessage: "チャレンジの取得に失敗しました",
	});
}

export async function checkFirstUser(): Promise<CheckFirstUserResponse> {
	return getAppRuntime().http.requestJson<CheckFirstUserResponse>({
		path: "auth/check-first-user",
		errorMessage: "初回ユーザーチェックに失敗しました",
	});
}

export async function login(
	credentials: LoginCredentials,
): Promise<AuthResponse> {
	const challenge = await requestLoginChallenge(credentials.username);
	const verifier = await getAppRuntime().passwordCrypto.deriveVerifier(
		credentials.password,
		challenge.salt,
		challenge.iterations,
		challenge.keyLength,
		challenge.digest,
	);
	const signature =
		await getAppRuntime().passwordCrypto.computeChallengeResponse(
			verifier,
			challenge.challenge,
		);

	const data = await getAppRuntime().http.requestJson<AuthResponse>({
		path: "auth/login",
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: credentials.username,
				challengeToken: challenge.challengeToken,
				response: signature,
			}),
		},
		errorMessage: "ログインに失敗しました",
	});

	setAccessToken(data.access_token);
	return data;
}

export async function registerFirstUser(
	userData: FirstUserData,
): Promise<AuthResponse> {
	const challenge = await requestLoginChallenge(userData.username);
	const salt = getAppRuntime().passwordCrypto.generateSalt();
	const verifier = await getAppRuntime().passwordCrypto.deriveVerifier(
		userData.password,
		salt,
		challenge.iterations,
		challenge.keyLength,
		challenge.digest,
	);

	const data = await getAppRuntime().http.requestJson<AuthResponse>({
		path: "auth/first-user",
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: userData.username,
				passwordSalt: salt,
				passwordVerifier: verifier,
			}),
		},
		errorMessage: "管理者登録に失敗しました",
	});

	setAccessToken(data.access_token);
	return data;
}

export async function register(userData: RegisterData): Promise<AuthResponse> {
	const challenge = await requestLoginChallenge(userData.username);
	const salt = getAppRuntime().passwordCrypto.generateSalt();
	const verifier = await getAppRuntime().passwordCrypto.deriveVerifier(
		userData.password,
		salt,
		challenge.iterations,
		challenge.keyLength,
		challenge.digest,
	);

	const data = await getAppRuntime().http.requestJson<AuthResponse>({
		path: "auth/register",
		init: {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: userData.username,
				email: userData.email,
				passwordSalt: salt,
				passwordVerifier: verifier,
			}),
		},
		errorMessage: "ユーザー登録に失敗しました",
	});

	setAccessToken(data.access_token);
	return data;
}

export async function fetchAuthenticatedUserProfile(): Promise<UserProfile> {
	return getAppRuntime().http.requestJson<UserProfile>({
		path: "auth/profile",
		requiresAuth: true,
		errorMessage: "プロフィールの取得に失敗しました",
	});
}

export async function validateToken(): Promise<ValidateTokenResponse> {
	try {
		return await getAppRuntime().http.requestJson<ValidateTokenResponse>({
			path: "auth/validate",
			requiresAuth: true,
			errorMessage: "トークンの検証に失敗しました",
		});
	} catch (error) {
		clearAuthentication();
		throw error;
	}
}

export async function checkUserExists(): Promise<CheckUserExistsResponse> {
	return getAppRuntime().http.requestJson<CheckUserExistsResponse>({
		path: "auth/check-user-exists",
		requiresAuth: true,
		errorMessage: "ユーザー存在チェックに失敗しました",
	});
}
