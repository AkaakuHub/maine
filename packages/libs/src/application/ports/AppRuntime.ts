interface ApiConfigPort {
	getApiBaseUrl(): string;
}

interface TokenStoragePort {
	getAccessToken(): string | null;
	setAccessToken(token: string): void;
	removeAccessToken(): void;
}

interface KeyValueStoragePort {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

interface NavigationPort {
	goToLogin(): void;
	goToPath(path: string): void;
}

export interface HttpRequestInput {
	path: string;
	init?: RequestInit;
	requiresAuth?: boolean;
}

export interface JsonRequestInput extends HttpRequestInput {
	errorMessage: string;
}

interface HttpPort {
	request(input: HttpRequestInput): Promise<Response>;
	requestJson<T>(input: JsonRequestInput): Promise<T>;
}

interface PasswordCryptoPort {
	deriveVerifier(
		password: string,
		saltHex: string,
		iterations: number,
		keyLength: number,
		digest: string,
	): Promise<string>;
	computeChallengeResponse(
		verifierHex: string,
		challenge: string,
	): Promise<string>;
	generateSalt(byteLength?: number): string;
}

interface SharePort {
	shareCurrentPage(title: string): Promise<boolean>;
	copyCurrentPageUrl(): Promise<boolean>;
}

export interface AppRuntime {
	apiConfig: ApiConfigPort;
	tokenStorage: TokenStoragePort;
	keyValueStorage: KeyValueStoragePort;
	navigation: NavigationPort;
	http: HttpPort;
	passwordCrypto: PasswordCryptoPort;
	share: SharePort;
}
