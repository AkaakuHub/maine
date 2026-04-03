import { getAppRuntime } from "../../application/runtime";

export function getAuthorizationHeaders(): Record<string, string> {
	const token = getAppRuntime().tokenStorage.getAccessToken();

	return token ? { Authorization: `Bearer ${token}` } : {};
}
