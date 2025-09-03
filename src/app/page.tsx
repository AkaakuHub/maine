"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVideos } from "@/hooks/useVideos";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useWarningDialog } from "@/hooks/useWarningDialog";
import { useOfflineVideoManagement } from "@/hooks/useOfflineVideoManagement";
import { useVideoActions } from "@/hooks/useVideoActions";
import { useAppStateStore, type TabType } from "@/stores/appStateStore";
import { HeaderSection } from "@/components/home/HeaderSection";
import { TabNavigation } from "@/components/home/TabNavigation";
import { SearchSection } from "@/components/home/SearchSection";
import { OfflineManagementPanel } from "@/components/home/OfflineManagementPanel";
import { VideoContent } from "@/components/home/VideoContent";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import StreamingWarningDialog from "@/components/StreamingWarningDialog";
import PWADebugInfo from "@/components/PWADebugInfo";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { PAGINATION } from "@/utils/constants";

const Home = () => {
	// ネットワーク状態
	const { isOffline } = useNetworkStatus();
	const router = useRouter();
	const searchParams = useSearchParams();
	const isInitialized = useRef(false);

	// グローバル状態管理 (Zustand)
	const {
		// 検索状態
		searchTerm,
		searchQuery,
		sortBy,
		sortOrder,
		setIsComposing,
		setSearchTerm,
		handleSearch,
		handleClearSearch,
		setSortBy,
		toggleSortOrder,

		// 表示設定
		viewMode,
		setViewMode,

		// タブ管理
		activeTab,
		setActiveTab,

		// ページネーション
		currentPage,
		showAll,
		setCurrentPage,
		handleShowAll,
		handleTabChange: handleTabChangeStore,

		// 設定モーダル
		showSettings,
		handleShowSettings,
		handleCloseSettings,

		// URL同期
		initializeFromURL,
		getSearchParams,
	} = useAppStateStore();

	// オフラインストレージのフック
	const { cacheSize, storageEstimate, clearCache, refreshCachedVideos } =
		useOfflineStorage();

	// URL初期化: ページロード時にURLから状態を復元
	useEffect(() => {
		if (!isInitialized.current && searchParams) {
			initializeFromURL(searchParams);
			isInitialized.current = true;
		}
	}, [searchParams, initializeFromURL]);

	// URL更新: 状態変更時にURLを更新（初期化後のみ）
	useEffect(() => {
		if (isInitialized.current) {
			const params = getSearchParams();
			const query = params.toString();
			const currentQuery = searchParams?.toString() || "";

			if (query !== currentQuery) {
				const newUrl = query ? `/?${query}` : "/";
				router.replace(newUrl, { scroll: false });
			}
		}
	}, [getSearchParams, router, searchParams]);

	// オフライン状態に応じたタブ自動切り替え
	useEffect(() => {
		if (isOffline && activeTab === "streaming") {
			setActiveTab("offline");
		}
	}, [isOffline, activeTab, setActiveTab]);

	// 検索実行時の履歴管理（pushで新しい履歴エントリを作成）
	const handleSearchWithHistory = () => {
		handleSearch(); // Zustandストアの検索実行

		// 検索実行時のみpushで履歴を追加
		if (isInitialized.current) {
			const trimmedSearchTerm = searchTerm.trim();

			if (trimmedSearchTerm) {
				// 検索語がある場合は履歴に追加
				const params = new URLSearchParams();
				params.set("search", trimmedSearchTerm);

				if (sortBy !== "title") params.set("sortBy", sortBy);
				if (sortOrder !== "asc") params.set("sortOrder", sortOrder);

				const query = params.toString();
				const newUrl = query ? `/?${query}` : "/";
				router.push(newUrl, { scroll: false });
			} else {
				// 空検索の場合はトップページに戻る
				router.push("/", { scroll: false });
			}
		}
	};

	// タブ変更処理
	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		handleTabChangeStore(true);
		if (tab === "offline") {
			refreshCachedVideos();
		}
	};

	// 警告ダイアログの状態管理
	const {
		showStreamingWarning,
		warningVideoData,
		handleShowStreamingWarning,
		handleCloseStreamingWarning,
		handleContinueStreaming,
		handleUseOfflineFromWarning,
	} = useWarningDialog();

	// オフライン動画管理
	const { offlineVideos, handleOfflineVideoDelete, handleClearAllOffline } =
		useOfflineVideoManagement({
			activeTab,
			clearCache,
			refreshCachedVideos,
		});

	// 動画データのフック（オンライン時のみ）
	const {
		videos,
		loading: videosLoading,
		error: videosError,
		pagination,
		refetch: refetchVideos,
		hasNextPage,
		hasPrevPage,
	} = useVideos({
		filters: {
			search: searchQuery || undefined,
		},
		sorting: {
			sortBy,
			sortOrder,
		},
		pagination: {
			page: currentPage,
			limit: PAGINATION.DEFAULT_LIMIT,
		},
		loadAll: showAll,
		enabled: !isOffline, // オフライン時は無効化
	});

	// エラーハンドリングとコンテンツ状態
	const { handleRetry, hasContent } = useVideoActions({
		refetchVideos,
		videos,
		searchQuery,
		showAll,
	});

	if (videosLoading && !hasContent) {
		return (
			<div className="min-h-screen bg-surface-variant">
				<LoadingState type="initial" message="検索中..." />
			</div>
		);
	}

	if (videosError) {
		return (
			<div className="min-h-screen bg-surface-variant">
				<div className="container mx-auto px-4 py-8">
					<EmptyState type="loading-error" onRetry={handleRetry} />
				</div>
			</div>
		);
	}

	return (
		<main className="min-h-screen bg-surface-variant">
			{/* ヘッダーセクション */}
			<div className="bg-surface border-b border-border">
				<div className="container mx-auto px-6 py-6">
					<HeaderSection
						videosLoading={videosLoading}
						activeTab={activeTab}
						videos={videos}
						pagination={pagination}
						offlineVideos={offlineVideos}
						cacheSize={cacheSize}
						viewMode={viewMode}
						onShowSettings={handleShowSettings}
						onViewModeChange={setViewMode}
					/>

					<TabNavigation
						activeTab={activeTab}
						offlineVideos={offlineVideos}
						onTabChange={handleTabChange}
					/>

					{/* 検索・フィルターセクション（ストリーミングタブのみ） */}
					{activeTab === "streaming" && (
						<SearchSection
							searchTerm={searchTerm}
							sortBy={sortBy}
							sortOrder={sortOrder}
							onSearchTermChange={setSearchTerm}
							onSetIsComposing={setIsComposing}
							onSearch={handleSearchWithHistory}
							onClearSearch={handleClearSearch}
							onSortByChange={setSortBy}
							onSortOrderToggle={toggleSortOrder}
						/>
					)}

					{/* オフライン管理パネル */}
					{activeTab === "offline" && (
						<OfflineManagementPanel
							offlineVideos={offlineVideos}
							cacheSize={cacheSize}
							storageEstimate={storageEstimate}
							onRefreshCachedVideos={refreshCachedVideos}
							onClearAllOffline={handleClearAllOffline}
						/>
					)}
				</div>
			</div>

			{/* コンテンツエリア */}
			<VideoContent
				activeTab={activeTab}
				viewMode={viewMode}
				videos={videos}
				offlineVideos={offlineVideos}
				videosLoading={videosLoading}
				searchQuery={searchQuery}
				showAll={showAll}
				hasContent={hasContent}
				pagination={pagination}
				currentPage={currentPage}
				hasPrevPage={hasPrevPage}
				hasNextPage={hasNextPage}
				onShowStreamingWarning={handleShowStreamingWarning}
				onShowAll={handleShowAll}
				onOfflineVideoDelete={handleOfflineVideoDelete}
				onPageChange={setCurrentPage}
			/>
			{/* PWA デバッグ情報 */}
			{process.env.NODE_ENV === "development" && (
				<div className="mt-8">
					<PWADebugInfo />
				</div>
			)}
			{/* グローバル警告ダイアログ */}
			{warningVideoData && (
				<StreamingWarningDialog
					isOpen={showStreamingWarning}
					onClose={handleCloseStreamingWarning}
					onContinueStreaming={handleContinueStreaming}
					onUseOffline={handleUseOfflineFromWarning}
					videoTitle={warningVideoData.title}
				/>
			)}

			{/* 設定モーダル */}
			<SettingsModal isOpen={showSettings} onClose={handleCloseSettings} />
		</main>
	);
};

export default Home;
