import { getAppRuntime } from "../runtime";

export async function sharePage(title: string): Promise<boolean> {
	return getAppRuntime().share.shareCurrentPage(title);
}

export async function copyPageUrl(): Promise<boolean> {
	return getAppRuntime().share.copyCurrentPageUrl();
}
