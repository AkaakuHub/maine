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
	useContinueWatchingVideos,
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
		activeTab,

		// ページネーション
		currentPage,
		setCurrentPage,
		continuePage,
		setContinuePage,

		// 設定モーダル
		showSettings,
		handleShowSettings,
		handleCloseSettings,

		// URL同期
		initializeFromURL,
		getSearchParams,
		shouldCreateHistoryEntry,
		setShouldCreateHistoryEntry,
		handleTabChange,
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
	const buildReturnPath = useCallback(() => {
		const params = getSearchParams();
		const query = params.toString();
		return query ? `/?${query}` : "/";
	}, [getSearchParams]);

	const handlePlayVideo = useCallback(
		(id: string) => {
			const returnPath = buildReturnPath();
			const basePath = `/play/${id}`;
			const targetUrl =
				returnPath === "/"
					? basePath
					: `${basePath}?returnTo=${encodeURIComponent(returnPath)}`;
			router.push(targetUrl);
		},
		[router, buildReturnPath],
	);

	const handleSwitchTab = useCallback(
		(tab: "streaming" | "continue") => {
			if (tab === activeTab) {
				return;
			}
			handleTabChange(tab);
		},
		[activeTab, handleTabChange],
	);

	// 警告ダイアログの状態管理
	const { handleShowStreamingWarning } = useWarningDialog();

	// 動画データのフック（オンライン時のみ）
	// URL初期化が完了してからデータ取得を開始
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
			search: searchQuery,
		},
		sorting: {
			sortBy,
			sortOrder,
		},
		pagination: {
			page: currentPage,
			limit: PAGINATION.DEFAULT_LIMIT,
		},
		enabled: isInitialized.current, // URL初期化完了後に有効化
	});

	const {
		videos: continueVideos,
		loading: continueLoading,
		error: continueError,
		pagination: continuePagination,
		refetch: refetchContinue,
		hasNextPage: continueHasNextPage,
		hasPrevPage: continueHasPrevPage,
	} = useContinueWatchingVideos({
		page: continuePage,
		limit: PAGINATION.DEFAULT_LIMIT,
		enabled: isInitialized.current,
	});

	// 動画ページから戻ってきた際に進捗情報を更新するためのリフレッシュ処理
	useEffect(() => {
		if (shouldRefreshVideos) {
			refetchVideos();
			refetchContinue();
			consumeRefresh();
		}
	}, [shouldRefreshVideos, refetchVideos, refetchContinue, consumeRefresh]);

	// エラーハンドリングとコンテンツ状態
	const { handleRetry, hasContent } = useVideoActions({
		refetchVideos,
		videos,
		searchQuery,
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

	const continueHasContent = continueVideos.length > 0;

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

					<TabNavigation activeTab={activeTab} onTabChange={handleSwitchTab} />

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
							videosLoading={videosLoading}
							videos={videos}
							pagination={pagination}
						/>
					)}
				</div>
			</div>

			{/* コンテンツエリア */}
			{activeTab === "streaming" ? (
				<VideoContent
					viewMode={viewMode}
					videos={videos}
					videosLoading={videosLoading}
					searchQuery={searchQuery}
					hasContent={hasContent}
					pagination={pagination}
					currentPage={currentPage}
					hasPrevPage={hasPrevPage}
					hasNextPage={hasNextPage}
					onShowStreamingWarning={handleShowStreamingWarning}
					onPageChange={setCurrentPage}
					onRetry={handleRetry}
					onPlay={handlePlayVideo}
				/>
			) : (
				<>
					<div className="bg-surface border-b border-border">
						<div className="container mx-auto px-6 py-6">
							<div className="bg-surface-elevated rounded-lg p-5 border border-border/60">
								<h2 className="text-xl font-semibold text-text mb-1">
									続きから視聴
								</h2>
								<p className="text-text-secondary text-sm">
									視聴途中の動画を最新の視聴順に表示します。
								</p>
							</div>
						</div>
					</div>

					{continueError ? (
						<div className="container mx-auto px-6 py-6">
							<EmptyState
								type="loading-error"
								errorMessage={continueError}
								onRetry={() => {
									void refetchContinue();
								}}
							/>
						</div>
					) : continueVideos.length === 0 && !continueLoading ? (
						<div className="container mx-auto px-6 py-6">
							<EmptyState type="continue-empty" />
						</div>
					) : (
						<VideoContent
							viewMode={viewMode}
							videos={continueVideos}
							videosLoading={continueLoading}
							searchQuery=""
							hasContent={continueHasContent}
							pagination={continuePagination}
							currentPage={continuePage}
							hasPrevPage={continueHasPrevPage}
							hasNextPage={continueHasNextPage}
							onShowStreamingWarning={handleShowStreamingWarning}
							onPageChange={setContinuePage}
							onPlay={handlePlayVideo}
						/>
					)}
				</>
			)}

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
