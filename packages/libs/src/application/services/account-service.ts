import type { UserProfile } from "../../domain/auth/models";
import { getAppRuntime } from "../runtime";

export interface AccountProfile extends UserProfile {
	createdAt: string;
	updatedAt: string;
}

export interface UpdateProfilePayload {
	username?: string;
	email?: string;
}

export interface UpdatePasswordPayload {
	username: string;
	currentPassword: string;
	newPassword: string;
}

interface LoginChallenge {
	challenge: string;
	challengeToken: string;
	salt: string;
	iterations: number;
	keyLength: number;
	digest: string;
}

async function requestChallenge(username: string): Promise<LoginChallenge> {
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

export async function fetchAccountProfile(): Promise<AccountProfile> {
	return getAppRuntime().http.requestJson<AccountProfile>({
		path: "users/me",
		init: {
			headers: {
				"Content-Type": "application/json",
			},
			cache: "no-store",
		},
		requiresAuth: true,
		errorMessage: "プロフィールの取得に失敗しました",
	});
}

export async function updateAccountProfile(
	payload: UpdateProfilePayload,
): Promise<AccountProfile> {
	return getAppRuntime().http.requestJson<AccountProfile>({
		path: "users/me/profile",
		init: {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		},
		requiresAuth: true,
		errorMessage: "プロフィールの更新に失敗しました",
	});
}

export async function updateAccountPassword(
	payload: UpdatePasswordPayload,
): Promise<{ message: string }> {
	const challenge = await requestChallenge(payload.username);
	const currentVerifier = await getAppRuntime().passwordCrypto.deriveVerifier(
		payload.currentPassword,
		challenge.salt,
		challenge.iterations,
		challenge.keyLength,
		challenge.digest,
	);
	const signature =
		await getAppRuntime().passwordCrypto.computeChallengeResponse(
			currentVerifier,
			challenge.challenge,
		);
	const newSalt = getAppRuntime().passwordCrypto.generateSalt();
	const newVerifier = await getAppRuntime().passwordCrypto.deriveVerifier(
		payload.newPassword,
		newSalt,
		challenge.iterations,
		challenge.keyLength,
		challenge.digest,
	);

	return getAppRuntime().http.requestJson<{ message: string }>({
		path: "users/me/password",
		init: {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				challengeToken: challenge.challengeToken,
				response: signature,
				newSalt,
				newVerifier,
			}),
			cache: "no-store",
		},
		requiresAuth: true,
		errorMessage: "パスワードの更新に失敗しました",
	});
}
