import { getAppRuntime } from "../runtime";

export function getStoredItem(key: string): string | null {
	return getAppRuntime().keyValueStorage.getItem(key);
}

export function setStoredItem(key: string, value: string): void {
	getAppRuntime().keyValueStorage.setItem(key, value);
}

export function removeStoredItem(key: string): void {
	getAppRuntime().keyValueStorage.removeItem(key);
}
