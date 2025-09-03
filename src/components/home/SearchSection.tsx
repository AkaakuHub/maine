"use client";

import { Search, X, SortAsc, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SEARCH } from "@/utils/constants";
import type { SortBy, SortOrder } from "@/stores/appStateStore";

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
}: SearchSectionProps) {
	return (
		<div className="container mx-auto px-6">
			{/* 検索・フィルターセクション（ストリーミングタブのみ） */}
			<div className="bg-surface-elevated rounded-lg p-4">
				<div className="flex flex-col lg:flex-row gap-4">
					{/* 検索入力 */}
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
						<input
							type="text"
							placeholder={`動画タイトルやファイル名で検索... (${SEARCH.MIN_QUERY_LENGTH}文字以上)`}
							value={searchTerm}
							onChange={(e) => onSearchTermChange(e.target.value)}
							onCompositionStart={() => onSetIsComposing(true)}
							onCompositionEnd={() => onSetIsComposing(false)}
							className="w-full pl-10 pr-24 py-3 bg-surface border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
						/>
						<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
							{searchTerm && (
								<button
									type="button"
									onClick={onClearSearch}
									className="p-1 text-text-secondary hover:text-text transition-colors rounded-md hover:bg-surface-elevated"
								>
									<X className="h-4 w-4" />
								</button>
							)}
							<Button
								onClick={onSearch}
								disabled={
									!searchTerm.trim() ||
									searchTerm.trim().length < SEARCH.MIN_QUERY_LENGTH
								}
								size="sm"
								className="h-8"
							>
								検索
							</Button>
						</div>
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

				{/* 検索ヘルプメッセージ */}
				{searchTerm &&
					searchTerm.trim().length > 0 &&
					searchTerm.trim().length < SEARCH.MIN_QUERY_LENGTH && (
						<p className="mt-2 text-xs text-warning flex items-center gap-2">
							<span className="w-1 h-1 bg-warning rounded-full" />
							検索には{SEARCH.MIN_QUERY_LENGTH}文字以上入力してください
						</p>
					)}
			</div>
		</div>
	);
}
