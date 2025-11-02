"use client";

import { useEffect, useState } from "react";
import {
	formatSafeDate,
	formatSafeDateTime,
	formatSafeTime,
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

		try {
			const formatted = formatters[format](date, fallback);
			setFormattedDate(formatted);
		} catch (error) {
			console.error("[SafeDateDisplay Debug] Error formatting date:", error);
			setFormattedDate(fallback);
		}
	}, [date, format, fallback]);

	return <span className={className}>{formattedDate}</span>;
}
