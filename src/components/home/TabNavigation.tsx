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
		<div className="container mx-auto px-6">
			{/* タブナビゲーション */}
			<div className="flex bg-surface-elevated rounded-lg p-1 mb-6">
				<button
					type="button"
					onClick={() => onTabChange("streaming")}
					className={cn(
						"flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-md transition-all duration-200 font-medium",
						activeTab === "streaming"
							? "bg-primary text-text-inverse shadow-sm"
							: "text-text-secondary hover:text-text hover:bg-surface",
					)}
				>
					<Wifi className="h-5 w-5" />
					<span>ストリーミング</span>
				</button>
				<button
					type="button"
					onClick={() => onTabChange("offline")}
					className={cn(
						"flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-md transition-all duration-200 font-medium relative",
						activeTab === "offline"
							? "bg-primary text-text-inverse shadow-sm"
							: "text-text-secondary hover:text-text hover:bg-surface",
					)}
				>
					<Download className="h-5 w-5" />
					<span>オフライン動画</span>
					{offlineVideos.length > 0 && (
						<span
							className={cn(
								"absolute -top-1 -right-1 px-2 py-0.5 text-xs rounded-full font-semibold",
								activeTab === "offline"
									? "bg-surface text-primary"
									: "bg-primary text-text-inverse",
							)}
						>
							{offlineVideos.length}
						</span>
					)}
				</button>
			</div>
		</div>
	);
}
