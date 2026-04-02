"use client";

import {
	ArrowUpLeft,
	Clock3,
	Loader2,
	Search,
	SortAsc,
	SortDesc,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { SortBy, SortOrder } from "../../stores/appStateStore";
import type { VideoFileData } from "../../type";
import { useRecentSearches } from "./useRecentSearches";

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
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
	const { recentSearches, addRecentSearch, removeRecentSearch } =
		useRecentSearches();

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsSuggestionsOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
		};
	}, []);

	const filteredSearches = useMemo(() => {
		const normalizedSearchTerm = searchTerm.trim().toLowerCase();
		if (!normalizedSearchTerm) {
			return recentSearches;
		}

		return recentSearches.filter((item) =>
			item.query.toLowerCase().includes(normalizedSearchTerm),
		);
	}, [recentSearches, searchTerm]);

	const shouldShowSuggestions =
		isSuggestionsOpen && filteredSearches.length > 0;

	const handleSearchSubmit = () => {
		addRecentSearch(searchTerm);
		onSearch();
		setIsSuggestionsOpen(false);
	};

	const handleSuggestionSelect = (query: string) => {
		onSearchTermChange(query);
		addRecentSearch(query);
		onSearch();
		setIsSuggestionsOpen(false);
	};

	return (
		<div className="container mx-auto px-6">
			{/* 検索・フィルターセクション（ストリーミングタブのみ） */}
			<div className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
					{/* 検索入力 */}
					<div className="relative z-20 flex-1" ref={containerRef}>
						<Input
							ref={inputRef}
							placeholder="動画タイトルやファイル名で検索..."
							value={searchTerm}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								onSearchTermChange(e.target.value)
							}
							onFocus={() => {
								setIsSuggestionsOpen(true);
							}}
							onKeyDown={(event) => {
								if (event.key === "Escape") {
									setIsSuggestionsOpen(false);
								}
							}}
							onCompositionStart={() => onSetIsComposing(true)}
							onCompositionEnd={() => onSetIsComposing(false)}
							variant="search"
							leftIcon={<Search className="h-5 w-5" />}
							className="rounded-xl border-0 bg-surface-elevated shadow-sm"
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
										onClick={handleSearchSubmit}
										size="sm"
										className="h-9 rounded-lg px-4 shadow-sm"
									>
										検索
									</Button>
								</>
							}
						/>

						{shouldShowSuggestions ? (
							<div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
								<div className="bg-surface px-2 py-1.5">
									{filteredSearches.map((item) => (
										<div
											key={item.query}
											className="group flex items-center gap-1.5 rounded-xl px-1.5 py-0.5 transition-colors hover:bg-surface-elevated"
										>
											<button
												type="button"
												onClick={() => handleSuggestionSelect(item.query)}
												className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors"
											>
												<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-text-secondary">
													<Clock3 className="h-4 w-4" />
												</span>
												<span className="truncate text-sm font-medium text-text">
													{item.query}
												</span>
											</button>
											<button
												type="button"
												onClick={() => {
													onSearchTermChange(item.query);
													inputRef.current?.focus();
												}}
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors group-hover:bg-surface group-hover:text-text hover:bg-surface hover:text-text"
												aria-label={`${item.query}を入力欄に入れる`}
											>
												<ArrowUpLeft className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => removeRecentSearch(item.query)}
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors group-hover:bg-surface group-hover:text-text hover:bg-surface hover:text-text"
												aria-label={`${item.query}を履歴から削除`}
											>
												<X className="h-4 w-4" />
											</button>
										</div>
									))}
								</div>
							</div>
						) : null}
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
