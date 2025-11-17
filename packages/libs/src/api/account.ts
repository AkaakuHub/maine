import { AuthAPI, type UserProfile } from "./auth";
import { createApiUrl } from "../utils/api";

export interface AccountProfile extends UserProfile {
	createdAt: string;
	updatedAt: string;
}

interface UpdateProfilePayload {
	username?: string;
	email?: string;
}

interface UpdatePasswordPayload {
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
		const response = await fetch(createApiUrl("users/me/password"), {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...AuthAPI.getAuthHeaders(),
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		});
		return handleResponse<{ message: string }>(response);
	},
};
