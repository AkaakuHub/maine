import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const formatDuration = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export const formatFileSize = (size: number | string): string => {
	const sizeNum = typeof size === "string" ? Number.parseInt(size, 10) : size;
	if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`;
	if (sizeNum < 1024 * 1024 * 1024)
		return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
	return `${(sizeNum / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const truncateText = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trim()}...`;
};
