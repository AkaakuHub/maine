"use client";

import { Clock3, Wifi } from "lucide-react";
import type { HomeTab } from "../../stores/appStateStore";
import { cn } from "../../libs/utils";

interface TabNavigationProps {
	activeTab: HomeTab;
	onTabChange: (tab: HomeTab) => void;
}

const tabs: Array<{
	id: HomeTab;
	label: string;
	description: string;
	Icon: typeof Wifi;
}> = [
	{
		id: "streaming",
		label: "ストリーミング",
		description: "全ての動画を表示",
		Icon: Wifi,
	},
	{
		id: "continue",
		label: "続きから視聴",
		description: "視聴履歴のある動画",
		Icon: Clock3,
	},
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
	return (
		<nav className="bg-surface">
			<div className="max-w-7xl mx-auto px-3 sm:px-6">
				<div className="flex gap-3 overflow-x-auto py-4">
					{tabs.map(({ id, label, description, Icon }) => {
						const isActive = activeTab === id;
						return (
							<button
								type="button"
								key={id}
								onClick={() => onTabChange(id)}
								className={cn(
									"flex min-w-[180px] flex-col gap-1.5 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all sm:min-w-[220px]",
									isActive
										? "border-primary/30 bg-primary/10 text-text shadow-sm"
										: "border-border bg-surface text-text-secondary hover:border-border hover:bg-surface-elevated hover:text-text",
								)}
							>
								<span className="flex items-center gap-2">
									<span
										className={cn(
											"flex h-8 w-8 items-center justify-center rounded-xl",
											isActive
												? "bg-primary text-text-inverse"
												: "bg-surface-elevated text-text-secondary",
										)}
									>
										<Icon className="h-4 w-4" />
									</span>
									{label}
								</span>
								<span className="whitespace-nowrap text-xs text-text-secondary">
									{description}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
