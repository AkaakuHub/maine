import { getAuthorizationHeaders } from "../infrastructure/http/authHeaders";
import {
	checkFirstUser,
	checkUserExists,
	clearAuthentication,
	fetchAuthenticatedUserProfile,
	getAccessToken,
	login,
	type LoginChallenge,
	type LoginCredentials,
	redirectToLogin,
	register,
	registerFirstUser,
	requestLoginChallenge,
	type AuthResponse,
	type FirstUserData,
	type RegisterData,
	type UserProfile,
	validateToken,
} from "../application/services/auth-service";

export type { UserProfile };

export const AuthAPI = {
	getAuthHeaders(): Record<string, string> {
		return getAuthorizationHeaders();
	},

	async checkFirstUser(): Promise<{
		isFirstUser: boolean;
		databaseReady: boolean;
		message: string;
	}> {
		return checkFirstUser();
	},

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		return login(credentials);
	},

	async registerFirstUser(userData: FirstUserData): Promise<AuthResponse> {
		return registerFirstUser(userData);
	},

	async register(userData: RegisterData): Promise<AuthResponse> {
		return register(userData);
	},

	async getProfile(): Promise<UserProfile> {
		return fetchAuthenticatedUserProfile();
	},

	logout(): void {
		clearAuthentication();
		redirectToLogin();
	},

	isAuthenticated(): boolean {
		return !!getAccessToken();
	},

	async checkAuth(): Promise<boolean> {
		try {
			await validateToken();
			return true;
		} catch {
			return false;
		}
	},

	async validateToken(): Promise<{ valid: boolean; user: UserProfile }> {
		return validateToken();
	},

	async checkUserExists(): Promise<{
		exists: boolean;
		userId: string;
	}> {
		return checkUserExists();
	},

	async requestChallenge(username: string): Promise<LoginChallenge> {
		return requestLoginChallenge(username);
	},
};
