import { useEffect, useState } from "react";
import {
	formatSafeDate,
	formatSafeTime,
	formatSafeDateTime,
} from "@/utils/safeDateFormat";

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

		setFormattedDate(formatters[format](date, fallback));
	}, [date, format, fallback]);

	return <span className={className}>{formattedDate}</span>;
}
