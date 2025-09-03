"use client";

import { Play, Grid, List, Settings } from "lucide-react";
import { cn, formatFileSize } from "@/libs/utils";
import type { VideoFileData } from "@/type";
import type { ViewMode, TabType } from "@/stores/appStateStore";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

interface PaginationData {
	total: number;
	page: number;
	totalPages: number;
	limit: number;
}

interface HeaderSectionProps {
	videosLoading: boolean;
	activeTab: TabType;
	videos: VideoFileData[];
	pagination: PaginationData;
	offlineVideos: VideoFileData[];
	cacheSize: number;
	viewMode: ViewMode;
	onShowSettings: () => void;
	onViewModeChange: (mode: ViewMode) => void;
}

export function HeaderSection({
	videosLoading,
	activeTab,
	videos,
	pagination,
	offlineVideos,
	cacheSize,
	viewMode,
	onShowSettings,
	onViewModeChange,
}: HeaderSectionProps) {
	return (
		<div className="bg-surface">
			<div className="container mx-auto px-6 py-6">
				{/* メインヘッダー */}
				<div className="space-y-4 mb-6">
					{/* アプリタイトル行 */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
								<Play className="w-6 h-6 text-text-inverse" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-text flex items-center gap-3">
									My Video Storage
									{videosLoading && activeTab === "streaming" && (
										<div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
									)}
								</h1>
								<p className="text-sm text-text-secondary mt-1">
									{activeTab === "streaming" ? (
										videos.length === 0 ? (
											"動画が見つかりません"
										) : pagination.total === 0 ||
											videos.length === pagination.total ? (
											`${videos.length} 動画`
										) : (
											`${videos.length} / ${pagination.total} 動画が見つかりました`
										)
									) : (
										<>
											{offlineVideos.length} 動画がオフラインで利用可能
											{cacheSize > 0 && ` (${formatFileSize(cacheSize)})`}
										</>
									)}
								</p>
							</div>
						</div>

						{/* 重要な操作ボタン（常に表示） */}
						<div className="flex items-center gap-3">
							{/* 設定ボタン */}
							<button
								type="button"
								onClick={onShowSettings}
								className="flex items-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-text-secondary hover:text-text transition-all duration-200"
								title="設定"
							>
								<Settings className="h-4 w-4" />
								<span className="hidden sm:inline text-sm">設定</span>
							</button>

							{/* PWAインストールボタン */}
							<PWAInstallPrompt />

							{/* 表示モード切り替え */}
							<div className="flex bg-surface-elevated rounded-lg p-1">
								<button
									type="button"
									onClick={() => onViewModeChange("grid")}
									className={cn(
										"flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium",
										viewMode === "grid"
											? "bg-primary text-text-inverse shadow-sm"
											: "text-text-secondary hover:text-text hover:bg-surface",
									)}
								>
									<Grid className="h-4 w-4" />
									<span className="hidden sm:inline">グリッド</span>
								</button>
								<button
									type="button"
									onClick={() => onViewModeChange("list")}
									className={cn(
										"flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium",
										viewMode === "list"
											? "bg-primary text-text-inverse shadow-sm"
											: "text-text-secondary hover:text-text hover:bg-surface",
									)}
								>
									<List className="h-4 w-4" />
									<span className="hidden sm:inline">リスト</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
