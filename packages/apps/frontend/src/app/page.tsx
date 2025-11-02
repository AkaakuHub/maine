"use client";

import {
	AuthGuard,
	EmptyState,
	HeaderSection,
	LoadingState,
	PAGINATION,
	SearchSection,
	SettingsModal,
	TabNavigation,
	VideoContent,
	useAppStateStore,
	useNavigationRefresh,
	useVideoActions,
	useVideos,
	useWarningDialog,
} from "@maine/libs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef } from "react";

const HomeContent = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isInitialized = useRef(false);
	const { shouldRefreshVideos, consumeRefresh } = useNavigationRefresh();

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

		// ページネーション
		currentPage,
		showAll,
		setCurrentPage,
		handleShowAll,

		// 設定モーダル
		showSettings,
		handleShowSettings,
		handleCloseSettings,

		// URL同期
		initializeFromURL,
		getSearchParams,
		shouldCreateHistoryEntry,
		setShouldCreateHistoryEntry,
	} = useAppStateStore();

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

				// 履歴エントリを作成するかどうかを判定
				if (shouldCreateHistoryEntry) {
					router.push(newUrl, { scroll: false });
					setShouldCreateHistoryEntry(false); // フラグをリセット
				} else {
					router.replace(newUrl, { scroll: false });
				}
			}
		}
	}, [
		getSearchParams,
		router,
		searchParams,
		shouldCreateHistoryEntry,
		setShouldCreateHistoryEntry,
	]);

	// 動画再生処理
	const handlePlayVideo = useCallback(
		(videoId: string) => {
			const url = `/play/${videoId}`;
			router.push(url);
		},
		[router],
	);

	// 警告ダイアログの状態管理
	const { handleShowStreamingWarning } = useWarningDialog();

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
		enabled: true,
	});

	// 動画ページから戻ってきた際に進捗情報を更新するためのリフレッシュ処理
	useEffect(() => {
		if (shouldRefreshVideos) {
			refetchVideos();
			consumeRefresh();
		}
	}, [shouldRefreshVideos, refetchVideos, consumeRefresh]);

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
					<EmptyState type="loading-error" />
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
						viewMode={viewMode}
						onShowSettings={handleShowSettings}
						onViewModeChange={setViewMode}
						onScanNavigate={() => router.push("/scan")}
						router={router}
					/>

					<TabNavigation />

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
						videosLoading={videosLoading}
						videos={videos}
						pagination={pagination}
					/>
				</div>
			</div>

			{/* コンテンツエリア */}
			<VideoContent
				viewMode={viewMode}
				videos={videos}
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
				onPageChange={setCurrentPage}
				onRetry={handleRetry}
				onPlay={handlePlayVideo}
			/>

			{/* 設定モーダル */}
			<SettingsModal isOpen={showSettings} onClose={handleCloseSettings} />
		</main>
	);
};

const Home = () => {
	const router = useRouter();

	return (
		<AuthGuard
			onRedirect={(path) => {
				if (path) {
					router.push(path);
				}
			}}
		>
			<Suspense
				fallback={
					<div className="min-h-screen bg-surface-variant">
						<div className="container mx-auto px-4 py-8">Loading...</div>
					</div>
				}
			>
				<HomeContent />
			</Suspense>
		</AuthGuard>
	);
};

export default Home;
