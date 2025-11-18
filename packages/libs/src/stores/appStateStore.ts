import { create } from "zustand";

export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list";
export type HomeTab = "streaming" | "continue";

interface AppStateStore {
	// 検索状態
	searchTerm: string;
	searchQuery: string;
	isComposing: boolean;
	sortBy: SortBy;
	sortOrder: SortOrder;

	// 表示設定
	viewMode: ViewMode;
	activeTab: HomeTab;

	// 設定モーダル
	showSettings: boolean;

	// ページネーション
	currentPage: number;
	continuePage: number;

	// URL履歴管理
	shouldCreateHistoryEntry: boolean;

	// Actions
	setSearchTerm: (term: string) => void;
	setSearchQuery: (query: string) => void;
	setIsComposing: (composing: boolean) => void;
	setSortBy: (sortBy: SortBy) => void;
	setSortOrder: (sortOrder: SortOrder) => void;
	setViewMode: (mode: ViewMode) => void;
	setActiveTab: (tab: HomeTab) => void;
	setShowSettings: (show: boolean) => void;
	setCurrentPage: (page: number) => void;
	setContinuePage: (page: number) => void;

	// Compound actions
	handleSearch: () => void;
	handleClearSearch: () => void;
	toggleSortOrder: () => void;
	resetPagination: () => void;
	handleTabChange: (tab: HomeTab, resetSearch?: boolean) => void;
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
	activeTab: "streaming",
	showSettings: false,
	currentPage: 1,
	continuePage: 1,
	shouldCreateHistoryEntry: false,

	// Basic setters
	setSearchTerm: (term) => set({ searchTerm: term }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	setIsComposing: (composing) => set({ isComposing: composing }),
	setSortBy: (sortBy) => {
		set({ sortBy, currentPage: 1 });
	},
	setSortOrder: (sortOrder) => {
		set({ sortOrder, currentPage: 1 });
	},
	setViewMode: (mode) => set({ viewMode: mode }),
	setActiveTab: (tab) => set({ activeTab: tab }),
	setShowSettings: (show) => set({ showSettings: show }),
	setCurrentPage: (page) => set({ currentPage: page }),
	setContinuePage: (page) => set({ continuePage: page }),
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
				shouldCreateHistoryEntry: true,
			});
		} else {
			set({
				searchQuery: trimmedTerm,
				currentPage: 1,
				shouldCreateHistoryEntry: true,
			});
		}
	},

	handleClearSearch: () => {
		set({
			searchTerm: "",
			searchQuery: "",
			currentPage: 1,
			shouldCreateHistoryEntry: true,
		});
	},

	toggleSortOrder: () => {
		const { sortOrder } = get();
		const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
		set({ sortOrder: newSortOrder, currentPage: 1 });
	},

	resetPagination: () => {
		set({ currentPage: 1 });
	},

	handleTabChange: (tab, resetSearch = false) => {
		const updates: Partial<AppStateStore> = {
			activeTab: tab,
			shouldCreateHistoryEntry: true,
		};
		if (tab === "streaming") {
			updates.currentPage = 1;
			if (resetSearch) {
				updates.searchTerm = "";
				updates.searchQuery = "";
			}
		} else {
			updates.continuePage = 1;
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
		const streamingPage = Number.parseInt(params.get("page") || "1", 10);
		const continuePage = Number.parseInt(params.get("continuePage") || "1", 10);
		const tabParam = params.get("tab") as HomeTab | null;
		const activeTab: HomeTab =
			tabParam === "continue" ? "continue" : "streaming";

		const normalizedStreamingPage = Number.isNaN(streamingPage)
			? 1
			: Math.max(1, streamingPage);
		const normalizedContinuePage = Number.isNaN(continuePage)
			? 1
			: Math.max(1, continuePage);

		const trimmedQuery = searchQuery.trim();
		const baseState = {
			sortBy,
			sortOrder,
			currentPage: normalizedStreamingPage,
			continuePage: normalizedContinuePage,
			activeTab,
			shouldCreateHistoryEntry: false,
		};

		if (trimmedQuery) {
			set({
				...baseState,
				searchTerm: trimmedQuery,
				searchQuery: trimmedQuery,
			});
		} else {
			set({
				...baseState,
				searchTerm: "",
				searchQuery: "",
			});
		}
	},

	getSearchParams: () => {
		const {
			searchQuery,
			sortBy,
			sortOrder,
			currentPage,
			continuePage,
			activeTab,
		} = get();
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

		if (continuePage > 1) {
			params.set("continuePage", continuePage.toString());
		}

		if (activeTab !== "streaming") {
			params.set("tab", activeTab);
		}

		return params;
	},
}));
