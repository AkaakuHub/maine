interface CacheStatsCardProps {
	title: string;
	value: string | number;
	description?: string;
	className?: string;
}

export function CacheStatsCard({
	title,
	value,
	description,
	className = "",
}: CacheStatsCardProps) {
	return (
		<div className="bg-surface-elevated rounded-lg p-4">
			<div className="text-sm text-text-secondary mb-1">{title}</div>
			<div className={`font-bold ${className}`}>{value}</div>
			{description && (
				<div className="text-xs text-text-muted mt-1">{description}</div>
			)}
		</div>
	);
}
