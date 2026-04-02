"use client";

import { Loader2, Search, SortAsc, SortDesc, X } from "lucide-react";
import type React from "react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { SortBy, SortOrder } from "../../stores/appStateStore";
import type { VideoFileData } from "../../type";

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
	videos: VideoFileData[];
	pagination: PaginationData;
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
	videos,
	pagination,
}: SearchSectionProps) {
	return (
		<div className="container mx-auto px-6">
			{/* 検索・フィルターセクション（ストリーミングタブのみ） */}
			<div className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
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
							className="rounded-xl border-border bg-surface-elevated shadow-sm"
							rightContent={
								<>
									{searchTerm && (
										<button
											type="button"
											onClick={onClearSearch}
											className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text"
										>
											<X className="h-4 w-4" />
										</button>
									)}
									<Button
										onClick={onSearch}
										size="sm"
										className="h-9 rounded-lg px-4 shadow-sm"
									>
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
							className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="title">タイトル順</option>
							<option value="year">年度順</option>
							<option value="episode">エピソード順</option>
							<option value="createdAt">作成日順</option>
						</select>

						<button
							type="button"
							onClick={onSortOrderToggle}
							className="flex items-center justify-center rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-text shadow-sm transition-all duration-200 hover:bg-surface"
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
				<div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
					<div className="flex items-center gap-2 text-sm text-text-secondary">
						{videosLoading && (
							<Loader2 className="w-4 h-4 animate-spin text-primary" />
						)}
						<span>
							{videos.length === 0
								? "動画が見つかりません"
								: pagination.total === 0 || videos.length === pagination.total
									? `${videos.length} 動画を表示中`
									: `${videos.length} / ${pagination.total} 動画を表示中`}
						</span>
					</div>
					<div className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
						page {pagination.page} / {Math.max(1, pagination.totalPages)}
					</div>
				</div>
			</div>
		</div>
	);
}
