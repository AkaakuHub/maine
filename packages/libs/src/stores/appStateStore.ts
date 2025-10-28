import { create } from "zustand";

export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list";

interface AppStateStore {
	// 検索状態
	searchTerm: string;
	searchQuery: string;
	isComposing: boolean;
	sortBy: SortBy;
	sortOrder: SortOrder;

	// 表示設定
	viewMode: ViewMode;

	// 設定モーダル
	showSettings: boolean;

	// ページネーション
	currentPage: number;
	showAll: boolean;

	// URL履歴管理
	shouldCreateHistoryEntry: boolean;

	// Actions
	setSearchTerm: (term: string) => void;
	setSearchQuery: (query: string) => void;
	setIsComposing: (composing: boolean) => void;
	setSortBy: (sortBy: SortBy) => void;
	setSortOrder: (sortOrder: SortOrder) => void;
	setViewMode: (mode: ViewMode) => void;
	setShowSettings: (show: boolean) => void;
	setCurrentPage: (page: number) => void;
	setShowAll: (showAll: boolean) => void;

	// Compound actions
	handleSearch: () => void;
	handleClearSearch: () => void;
	toggleSortOrder: () => void;
	resetPagination: () => void;
	handleShowAll: () => void;
	handleTabChange: (resetSearch?: boolean) => void;
	handleShowSettings: () => void;
	handleCloseSettings: () => void;

	// URL同期
	initializeFromURL: (params: URLSearchParams) => void;
	getSearchParams: () => URLSearchParams;
	setShouldCreateHistoryEntry: (should: boolean) => void;
}

export const useAppStateStore = create<AppStateStore>((set, get) => ({
	// Initial state
	searchTerm: "",
	searchQuery: "",
	isComposing: false,
	sortBy: "title",
	sortOrder: "asc",
	viewMode: "grid",
	showSettings: false,
	currentPage: 1,
	showAll: false,
	shouldCreateHistoryEntry: false,

	// Basic setters
	setSearchTerm: (term) => set({ searchTerm: term }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	setIsComposing: (composing) => set({ isComposing: composing }),
	setSortBy: (sortBy) => {
		set({ sortBy, currentPage: 1, showAll: false });
	},
	setSortOrder: (sortOrder) => {
		set({ sortOrder, currentPage: 1, showAll: false });
	},
	setViewMode: (mode) => set({ viewMode: mode }),
	setShowSettings: (show) => set({ showSettings: show }),
	setCurrentPage: (page) => set({ currentPage: page }),
	setShowAll: (showAll) => set({ showAll }),
	setShouldCreateHistoryEntry: (should) =>
		set({ shouldCreateHistoryEntry: should }),

	// Compound actions
	handleSearch: () => {
		const { searchTerm } = get();
		const trimmedTerm = searchTerm.trim();

		// 空白検索の場合は常に初期状態に戻す
		if (!trimmedTerm) {
			set({
				searchQuery: "",
				currentPage: 1,
				searchTerm: "",
				showAll: false,
				shouldCreateHistoryEntry: true,
			});
		} else {
			set({
				searchQuery: trimmedTerm,
				currentPage: 1,
				showAll: false,
				shouldCreateHistoryEntry: true,
			});
		}
	},

	handleClearSearch: () => {
		set({ searchTerm: "", searchQuery: "", currentPage: 1, showAll: false });
	},

	toggleSortOrder: () => {
		const { sortOrder } = get();
		const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
		set({ sortOrder: newSortOrder, currentPage: 1, showAll: false });
	},

	resetPagination: () => {
		set({ currentPage: 1, showAll: false });
	},

	handleShowAll: () => {
		set({ showAll: true, currentPage: 1, searchTerm: "", searchQuery: "" });
	},

	handleTabChange: (resetSearch = false) => {
		const updates: Partial<
			Pick<
				AppStateStore,
				"currentPage" | "showAll" | "searchTerm" | "searchQuery"
			>
		> = {
			currentPage: 1,
			showAll: false,
		};
		if (resetSearch) {
			updates.searchTerm = "";
			updates.searchQuery = "";
		}
		set(updates);
	},

	handleShowSettings: () => set({ showSettings: true }),
	handleCloseSettings: () => set({ showSettings: false }),

	// URL同期メソッド
	initializeFromURL: (params: URLSearchParams) => {
		const searchQuery = params.get("search") || "";
		const sortBy = (params.get("sortBy") as SortBy) || "title";
		const sortOrder = (params.get("sortOrder") as SortOrder) || "asc";
		const currentPage = Number.parseInt(params.get("page") || "1", 10);
		// showAllはURLから読み取らない（常にfalseで初期化）

		set({
			searchTerm: searchQuery,
			searchQuery,
			sortBy,
			sortOrder,
			currentPage: Math.max(1, currentPage),
			showAll: false, // 常にfalse
		});
	},

	getSearchParams: () => {
		const { searchQuery, sortBy, sortOrder, currentPage } = get();
		const params = new URLSearchParams();

		// searchQueryが空でない場合のみURLに含める
		if (searchQuery?.trim()) {
			params.set("search", searchQuery.trim());
		}

		if (sortBy !== "title") {
			params.set("sortBy", sortBy);
		}

		if (sortOrder !== "asc") {
			params.set("sortOrder", sortOrder);
		}

		if (currentPage > 1) {
			params.set("page", currentPage.toString());
		}

		// showAllはURLに含めない

		return params;
	},
}));
