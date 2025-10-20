"use client";

import { useEffect, useState } from "react";
import {
	formatSafeDate,
	formatSafeTime,
	formatSafeDateTime,
} from "../../utils/safeDateFormat";

interface SafeDateDisplayProps {
	date: Date | string | null;
	format?: "date" | "time" | "datetime";
	fallback?: string;
	className?: string;
}

/**
 * SSR安全な日時表示コンポーネント
 * useEffect + useState パターンでhydrationエラーを防ぐ
 */
export function SafeDateDisplay({
	date,
	format = "datetime",
	fallback = "---",
	className,
}: SafeDateDisplayProps) {
	const [formattedDate, setFormattedDate] = useState(fallback);

	useEffect(() => {
		const formatters = {
			date: formatSafeDate,
			time: formatSafeTime,
			datetime: formatSafeDateTime,
		};

		// Debug logging for production issues
		console.log("[SafeDateDisplay Debug]", {
			date,
			format,
			dateType: typeof date,
			isValidDate: date instanceof Date ? !Number.isNaN(date.getTime()) : false,
			dateString: String(date),
		});

		try {
			const formatted = formatters[format](date, fallback);
			console.log("[SafeDateDisplay Debug] Formatted result:", formatted);
			setFormattedDate(formatted);
		} catch (error) {
			console.error("[SafeDateDisplay Debug] Error formatting date:", error);
			setFormattedDate(fallback);
		}
	}, [date, format, fallback]);

	return <span className={className}>{formattedDate}</span>;
}
