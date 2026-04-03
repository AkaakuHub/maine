import { getAppRuntime } from "../runtime";

export function navigateToPath(path: string): void {
	getAppRuntime().navigation.goToPath(path);
}
