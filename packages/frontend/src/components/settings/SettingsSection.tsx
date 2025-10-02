"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

interface SettingsSectionProps {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	badge?: string;
	children: React.ReactNode;
	isExpanded: boolean;
	onToggle: () => void;
}

export function SettingsSection({
	icon: Icon,
	title,
	badge,
	children,
	isExpanded,
	onToggle,
}: SettingsSectionProps) {
	return (
		<div className="bg-surface rounded-lg mb-6 overflow-hidden">
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between p-6 hover:bg-surface-hover transition-colors"
			>
				<div className="flex items-center gap-3">
					<Icon className="h-5 w-5 text-primary" />
					<h2 className="text-xl font-semibold text-text">{title}</h2>
					{badge && (
						<div className="bg-primary/20 text-primary px-2 py-1 rounded text-xs">
							{badge}
						</div>
					)}
				</div>
				{isExpanded ? (
					<ChevronUp className="h-5 w-5 text-text-secondary" />
				) : (
					<ChevronDown className="h-5 w-5 text-text-secondary" />
				)}
			</button>

			{isExpanded && (
				<div className="px-6 py-6 border-t border-border">{children}</div>
			)}
		</div>
	);
}
