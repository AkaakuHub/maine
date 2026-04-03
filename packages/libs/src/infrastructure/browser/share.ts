import { getCurrentLocationHref } from "./location";

export async function shareCurrentPage(title: string): Promise<boolean> {
	if (!navigator.share) {
		return false;
	}

	try {
		await navigator.share({
			title,
			url: getCurrentLocationHref(),
		});
		return true;
	} catch {
		return true;
	}
}

export async function copyCurrentPageUrl(): Promise<boolean> {
	if (!navigator.clipboard?.writeText || !window.isSecureContext) {
		return false;
	}

	await navigator.clipboard.writeText(getCurrentLocationHref());
	return true;
}
