import type { AppRuntime } from "./ports/AppRuntime";
import { browserAppRuntime } from "../infrastructure/browser/runtime";

const currentAppRuntime: AppRuntime = browserAppRuntime;

export function getAppRuntime(): AppRuntime {
	return currentAppRuntime;
}
