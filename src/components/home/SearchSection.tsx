"use client";

import type React from "react";
import { Search, X, SortAsc, SortDesc, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatFileSize } from "@/libs/utils";
import type { SortBy, SortOrder, TabType } from "@/stores/appStateStore";
import type { VideoFileData } from "@/type";

interface PaginationData {
	total: number;
	page: number;
	totalPages: number;
	limit: number;
}

interface SearchSectionProps {
	searchTerm: string;
	sortBy: SortBy;
	sortOrder: SortOrder;
	onSearchTermChange: (term: string) => void;
	onSetIsComposing: (composing: boolean) => void;
	onSearch: () => void;
	onClearSearch: () => void;
	onSortByChange: (sortBy: SortBy) => void;
	onSortOrderToggle: () => void;
	// Status Indicator props
	videosLoading: boolean;
	activeTab: TabType;
	videos: VideoFileData[];
	pagination: PaginationData;
	offlineVideos: VideoFileData[];
	cacheSize: number;
}

export function SearchSection({
	searchTerm,
	sortBy,
	sortOrder,
	onSearchTermChange,
	onSetIsComposing,
	onSearch,
	onClearSearch,
	onSortByChange,
	onSortOrderToggle,
	videosLoading,
	activeTab,
	videos,
	pagination,
	offlineVideos,
	cacheSize,
}: SearchSectionProps) {
	return (
		<div className="container mx-auto px-6">
			{/* 検索・フィルターセクション（ストリーミングタブのみ） */}
			<div className="bg-surface-elevated rounded-lg p-4">
				<div className="flex flex-col lg:flex-row gap-4">
					{/* 検索入力 */}
					<div className="flex-1">
						<Input
							placeholder="動画タイトルやファイル名で検索..."
							value={searchTerm}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								onSearchTermChange(e.target.value)
							}
							onCompositionStart={() => onSetIsComposing(true)}
							onCompositionEnd={() => onSetIsComposing(false)}
							variant="search"
							leftIcon={<Search className="h-5 w-5" />}
							rightContent={
								<>
									{searchTerm && (
										<button
											type="button"
											onClick={onClearSearch}
											className="p-1 text-text-secondary hover:text-text transition-colors rounded-md hover:bg-surface-elevated"
										>
											<X className="h-4 w-4" />
										</button>
									)}
									<Button onClick={onSearch} size="sm" className="h-8">
										検索
									</Button>
								</>
							}
						/>
					</div>

					{/* フィルター・ソートコントロール */}
					<div className="flex gap-3">
						<select
							value={sortBy}
							onChange={(e) => onSortByChange(e.target.value as SortBy)}
							className="px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
						>
							<option value="title">タイトル順</option>
							<option value="year">年度順</option>
							<option value="episode">エピソード順</option>
							<option value="createdAt">作成日順</option>
						</select>

						<button
							type="button"
							onClick={onSortOrderToggle}
							className="flex items-center justify-center px-3 py-2 bg-surface border border-border rounded-lg text-text hover:bg-surface-elevated transition-all duration-200"
							title={sortOrder === "asc" ? "昇順" : "降順"}
						>
							{sortOrder === "asc" ? (
								<SortAsc className="h-4 w-4" />
							) : (
								<SortDesc className="h-4 w-4" />
							)}
						</button>
					</div>
				</div>

				{/* Status Indicator */}
				<div className="mt-4 pt-3 border-t border-border">
					<div className="flex items-center gap-2 text-sm text-text-secondary">
						{videosLoading && activeTab === "streaming" && (
							<Loader2 className="w-4 h-4 animate-spin text-primary" />
						)}
						<span>
							{activeTab === "streaming" ? (
								videos.length === 0 ? (
									"動画が見つかりません"
								) : pagination.total === 0 ||
									videos.length === pagination.total ? (
									`${videos.length} 動画を表示中`
								) : (
									`${videos.length} / ${pagination.total} 動画を表示中`
								)
							) : (
								<>
									{offlineVideos.length} 動画がオフラインで利用可能
									{cacheSize > 0 && (
										<span className="text-text-muted ml-1">
											({formatFileSize(cacheSize)})
										</span>
									)}
								</>
							)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
