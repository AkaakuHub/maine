import {
	fetchAccountProfile,
	type AccountProfile,
	updateAccountPassword,
	updateAccountProfile,
	type UpdatePasswordPayload,
	type UpdateProfilePayload,
} from "../application/services/account-service";

export type { AccountProfile };

export const AccountAPI = {
	async getProfile(): Promise<AccountProfile> {
		return fetchAccountProfile();
	},

	async updateProfile(payload: UpdateProfilePayload): Promise<AccountProfile> {
		return updateAccountProfile(payload);
	},

	async updatePassword(
		payload: UpdatePasswordPayload,
	): Promise<{ message: string }> {
		return updateAccountPassword(payload);
	},
};
