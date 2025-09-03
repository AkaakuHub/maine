import { create } from "zustand";

export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";
export type TabType = "streaming" | "offline";
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

	// タブ管理
	activeTab: TabType;

	// 設定モーダル
	showSettings: boolean;

	// ページネーション
	currentPage: number;
	showAll: boolean;

	// Actions
	setSearchTerm: (term: string) => void;
	setSearchQuery: (query: string) => void;
	setIsComposing: (composing: boolean) => void;
	setSortBy: (sortBy: SortBy) => void;
	setSortOrder: (sortOrder: SortOrder) => void;
	setViewMode: (mode: ViewMode) => void;
	setActiveTab: (tab: TabType) => void;
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
	showAll: false,

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
	setActiveTab: (tab) => set({ activeTab: tab }),
	setShowSettings: (show) => set({ showSettings: show }),
	setCurrentPage: (page) => set({ currentPage: page }),
	setShowAll: (showAll) => set({ showAll }),

	// Compound actions
	handleSearch: () => {
		const { searchTerm } = get();
		set({ searchQuery: searchTerm, currentPage: 1, showAll: false });
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
}));
