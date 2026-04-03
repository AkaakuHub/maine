import type {
	AppRuntime,
	HttpRequestInput,
	JsonRequestInput,
} from "../../application/ports/AppRuntime";
import {
	computeChallengeResponseClient,
	deriveVerifier,
	generateClientSalt,
} from "./passwordCrypto";
import { copyCurrentPageUrl, shareCurrentPage } from "./share";

const ACCESS_TOKEN_KEY = "access_token";

const browserStorage = {
	getItem(key: string): string | null {
		if (typeof window === "undefined") {
			return null;
		}

		return window.localStorage.getItem(key);
	},
	setItem(key: string, value: string): void {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(key, value);
	},
	removeItem(key: string): void {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.removeItem(key);
	},
};

function createApiUrl(path: string, apiBaseUrl: string): string {
	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	return `${apiBaseUrl}/api/${cleanPath}`;
}

async function extractResponseMessage(
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
		if (typeof data.error === "string") {
			return data.error;
		}
		return fallback;
	} catch {
		const text = await response.text();
		return text || fallback;
	}
}

function getAuthorizedHeaders(
	initHeaders: HeadersInit | undefined,
): HeadersInit | undefined {
	const token = browserStorage.getItem(ACCESS_TOKEN_KEY);
	if (!token) {
		return initHeaders;
	}

	return {
		...(initHeaders ?? {}),
		Authorization: `Bearer ${token}`,
	};
}

async function request({
	path,
	init,
	requiresAuth,
}: HttpRequestInput): Promise<Response> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL as string;
	if (!apiBaseUrl) {
		throw new Error("API base URL is not configured");
	}

	return fetch(createApiUrl(path, apiBaseUrl), {
		...init,
		headers: requiresAuth ? getAuthorizedHeaders(init?.headers) : init?.headers,
	});
}

async function requestJson<T>({
	path,
	init,
	requiresAuth,
	errorMessage,
}: JsonRequestInput): Promise<T> {
	const response = await request({ path, init, requiresAuth });

	if (!response.ok) {
		throw new Error(await extractResponseMessage(response, errorMessage));
	}

	return response.json() as Promise<T>;
}

export const browserAppRuntime: AppRuntime = {
	apiConfig: {
		getApiBaseUrl(): string {
			return process.env.NEXT_PUBLIC_API_URL as string;
		},
	},
	tokenStorage: {
		getAccessToken(): string | null {
			return browserStorage.getItem(ACCESS_TOKEN_KEY);
		},
		setAccessToken(token: string): void {
			browserStorage.setItem(ACCESS_TOKEN_KEY, token);
		},
		removeAccessToken(): void {
			browserStorage.removeItem(ACCESS_TOKEN_KEY);
		},
	},
	keyValueStorage: browserStorage,
	navigation: {
		goToLogin(): void {
			if (typeof window === "undefined") {
				return;
			}

			window.location.href = "/login";
		},
		goToPath(path: string): void {
			if (typeof window === "undefined") {
				return;
			}

			window.location.href = path;
		},
	},
	http: {
		request,
		requestJson,
	},
	passwordCrypto: {
		deriveVerifier,
		computeChallengeResponse: computeChallengeResponseClient,
		generateSalt: generateClientSalt,
	},
	share: {
		shareCurrentPage,
		copyCurrentPageUrl,
	},
};
