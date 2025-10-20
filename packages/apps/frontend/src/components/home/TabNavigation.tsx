"use client";

import { Wifi, Download } from "lucide-react";
import { cn } from "@/libs/utils";
import type { VideoFileData } from "@/type";
import type { TabType } from "@/stores/appStateStore";

interface TabNavigationProps {
	activeTab: TabType;
	offlineVideos: VideoFileData[];
	onTabChange: (tab: TabType) => void;
}

export function TabNavigation({
	activeTab,
	offlineVideos,
	onTabChange,
}: TabNavigationProps) {
	return (
		<nav className="bg-surface">
			<div className="max-w-7xl mx-auto px-3 sm:px-6">
				<div className="flex space-x-4 sm:space-x-8 -mb-px" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "streaming"}
						onClick={() => onTabChange("streaming")}
						className={cn(
							"flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
							activeTab === "streaming"
								? "border-primary text-primary"
								: "border-transparent text-text-secondary hover:text-text hover:border-border",
						)}
					>
						<Wifi className="w-4 h-4" />
						<span>ストリーミング</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "offline"}
						onClick={() => onTabChange("offline")}
						className={cn(
							"flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 text-sm font-medium border-b-2 transition-colors relative whitespace-nowrap",
							activeTab === "offline"
								? "border-primary text-primary"
								: "border-transparent text-text-secondary hover:text-text hover:border-border",
						)}
					>
						<Download className="w-4 h-4" />
						<span>オフライン動画</span>
						{offlineVideos.length > 0 && (
							<span className="ml-1 sm:ml-2 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-surface-elevated text-text-secondary">
								{offlineVideos.length}
							</span>
						)}
					</button>
				</div>
			</div>
		</nav>
	);
}
