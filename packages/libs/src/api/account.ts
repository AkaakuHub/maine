import { AuthAPI, type UserProfile } from "./auth";
import { createApiUrl } from "../utils/api";
import {
	computeChallengeResponseClient,
	deriveVerifier,
	generateClientSalt,
} from "../utils/password-crypto";

export interface AccountProfile extends UserProfile {
	createdAt: string;
	updatedAt: string;
}

interface UpdateProfilePayload {
	username?: string;
	email?: string;
}

interface UpdatePasswordPayload {
	username: string;
	currentPassword: string;
	newPassword: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		let message = "サーバーエラーが発生しました";
		try {
			const data = await response.json();
			message = data.message ?? message;
		} catch {
			// ignore JSON parse errors
		}
		throw new Error(message);
	}
	return response.json() as Promise<T>;
}

export const AccountAPI = {
	async getProfile(): Promise<AccountProfile> {
		const response = await fetch(createApiUrl("users/me"), {
			headers: {
				"Content-Type": "application/json",
				...AuthAPI.getAuthHeaders(),
			},
			cache: "no-store",
		});
		return handleResponse<AccountProfile>(response);
	},

	async updateProfile(payload: UpdateProfilePayload): Promise<AccountProfile> {
		const response = await fetch(createApiUrl("users/me/profile"), {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...AuthAPI.getAuthHeaders(),
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		});
		return handleResponse<AccountProfile>(response);
	},

	async updatePassword(
		payload: UpdatePasswordPayload,
	): Promise<{ message: string }> {
		const challenge = await AuthAPI.requestChallenge(payload.username);
		const currentVerifier = await deriveVerifier(
			payload.currentPassword,
			challenge.salt,
			challenge.iterations,
			challenge.keyLength,
			challenge.digest,
		);
		const signature = await computeChallengeResponseClient(
			currentVerifier,
			challenge.challenge,
		);
		const newSalt = generateClientSalt();
		const newVerifier = await deriveVerifier(
			payload.newPassword,
			newSalt,
			challenge.iterations,
			challenge.keyLength,
			challenge.digest,
		);

		const response = await fetch(createApiUrl("users/me/password"), {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...AuthAPI.getAuthHeaders(),
			},
			body: JSON.stringify({
				challengeToken: challenge.challengeToken,
				response: signature,
				newSalt,
				newVerifier,
			}),
			cache: "no-store",
		});
		return handleResponse<{ message: string }>(response);
	},
};
