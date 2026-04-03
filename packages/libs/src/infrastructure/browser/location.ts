export function getCurrentLocationHref(): string {
	if (typeof window === "undefined") {
		return "";
	}

	return window.location.href;
}
