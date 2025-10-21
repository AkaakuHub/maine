const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL as string;

export const createApiUrl = (path: string): string => {
	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	return `${API_BASE_URL}/api/${cleanPath}`;
};
