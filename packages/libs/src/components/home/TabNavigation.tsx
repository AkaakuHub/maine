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
				<div className="flex space-x-4 sm:space-x-8 -mb-px overflow-x-auto">
					{tabs.map(({ id, label, description, Icon }) => {
						const isActive = activeTab === id;
						return (
							<button
								type="button"
								key={id}
								onClick={() => onTabChange(id)}
								className={cn(
									"flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 text-sm font-medium border-b-2 transition-colors",
									isActive
										? "border-primary text-primary"
										: "border-transparent text-text-secondary hover:text-text",
								)}
							>
								<span className="flex items-center gap-1.5">
									<Icon className="w-4 h-4" />
									{label}
								</span>
								<span className="text-xs text-text-secondary whitespace-nowrap">
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
