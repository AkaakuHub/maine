"use client";

import { useEffect } from "react";
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
	} = useAppStateStore();

	// オフラインストレージのフック
	const { cacheSize, storageEstimate, clearCache, refreshCachedVideos } =
		useOfflineStorage();

	// オフライン状態に応じたタブ自動切り替え
	useEffect(() => {
		if (isOffline && activeTab === "streaming") {
			setActiveTab("offline");
		}
	}, [isOffline, activeTab, setActiveTab]);

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
							onSearch={handleSearch}
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
