export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterData {
	username: string;
	email: string;
	password: string;
}

export interface FirstUserData {
	username: string;
	password: string;
}

export interface UserProfile {
	userId: string;
	id: string;
	username: string;
	email: string;
	role: string;
	isActive: boolean;
}

export interface AuthResponse {
	access_token: string;
	user: UserProfile;
}

export interface LoginChallenge {
	challenge: string;
	challengeToken: string;
	salt: string;
	iterations: number;
	keyLength: number;
	digest: string;
}
