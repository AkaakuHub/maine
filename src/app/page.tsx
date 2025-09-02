"use client";

import { useState, useCallback, useEffect } from "react";
import {
	Search,
	Grid,
	List,
	X,
	SortAsc,
	SortDesc,
	Download,
	Wifi,
	Trash2,
	RefreshCw,
	Settings,
	Play,
} from "lucide-react";
import { useVideos } from "@/hooks/useVideos";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import VideoGridContainer from "@/components/VideoGridContainer";
import VideoList from "@/components/VideoList";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import StreamingWarningDialog from "@/components/StreamingWarningDialog";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWADebugInfo from "@/components/PWADebugInfo";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Button } from "@/components/ui/Button";
import { cn, formatFileSize } from "@/libs/utils";
import { PAGINATION, SEARCH } from "@/utils/constants";
import type { VideoFileData } from "@/type";
import { createAPIClient } from "@/libs/apiClient";

export type ViewMode = "grid" | "list";
export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";
export type TabType = "streaming" | "offline";

const Home = () => {
	// ネットワーク状態
	const { isOffline } = useNetworkStatus();

	// UI状態
	const [activeTab, setActiveTab] = useState<TabType>("streaming");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchQuery, setSearchQuery] = useState(""); // 実際の検索クエリ
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortBy>("title");
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
	const [currentPage, setCurrentPage] = useState(1); // IME状態管理
	const [isComposing, setIsComposing] = useState(false);
	const [showAll, setShowAll] = useState(false); // 一覧表示フラグ

	// 警告ダイアログの状態
	const [showStreamingWarning, setShowStreamingWarning] = useState(false);
	const [warningVideoData, setWarningVideoData] =
		useState<VideoFileData | null>(null);
	const [showSettings, setShowSettings] = useState(false);

	// オフライン時は自動的にオフラインタブに切り替え
	useEffect(() => {
		if (isOffline && activeTab === "streaming") {
			setActiveTab("offline");
		}
	}, [isOffline, activeTab]);

	// オフライン動画データの状態管理
	const [offlineVideos, setOfflineVideos] = useState<VideoFileData[]>([]);
	// const [offlineLoading, setOfflineLoading] = useState(false);

	// オフライン動画の取得
	const loadOfflineVideos = useCallback(async () => {
		if (activeTab !== "offline") return;

		// setOfflineLoading(true);
		try {
			const apiClient = createAPIClient(true);
			const videos = await apiClient.getVideos();
			setOfflineVideos(videos);
		} catch (error) {
			console.error("オフライン動画の取得に失敗:", error);
		} finally {
			// setOfflineLoading(false);
		}
	}, [activeTab]);

	useEffect(() => {
		if (activeTab === "offline") {
			loadOfflineVideos();
		}
	}, [activeTab, loadOfflineVideos]);

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

	// オフラインストレージのフック
	const { cacheSize, storageEstimate, clearCache, refreshCachedVideos } =
		useOfflineStorage();
	// タブ切り替え時にページをリセット
	const handleTabChange = (tab: TabType) => {
		// オフライン時はストリーミングタブに切り替えを禁止
		if (isOffline && tab === "streaming") {
			console.log("オフライン時はストリーミングタブに切り替えできません");
			return;
		}

		setActiveTab(tab);
		setCurrentPage(1);
		setSearchTerm("");
		setSearchQuery("");
		if (tab === "offline") {
			refreshCachedVideos();
		}
	};

	// オフライン動画の削除処理
	const handleOfflineVideoDelete = useCallback(async () => {
		await refreshCachedVideos();
	}, [refreshCachedVideos]);

	// 警告ダイアログを表示する
	const handleShowStreamingWarning = useCallback((video: VideoFileData) => {
		setWarningVideoData(video);
		setShowStreamingWarning(true);
	}, []);

	// 警告ダイアログを閉じる
	const handleCloseStreamingWarning = useCallback(() => {
		setShowStreamingWarning(false);
		setWarningVideoData(null);
	}, []);

	// 警告ダイアログからストリーミングを続行
	const handleContinueStreaming = useCallback(() => {
		if (warningVideoData) {
			handleCloseStreamingWarning();
			// 次のフレームでナビゲーションを実行
			setTimeout(() => {
				window.location.href = `/play/${encodeURIComponent(warningVideoData.filePath)}`;
			}, 0);
		}
	}, [warningVideoData, handleCloseStreamingWarning]);

	// 警告ダイアログからオフライン再生を選択
	const handleUseOfflineFromWarning = useCallback(() => {
		if (warningVideoData) {
			handleCloseStreamingWarning();
			// 次のフレームでナビゲーションを実行
			setTimeout(() => {
				window.location.href = `/play/${encodeURIComponent(warningVideoData.filePath)}?offline=true`;
			}, 0);
		}
	}, [warningVideoData, handleCloseStreamingWarning]);

	// 全てのオフライン動画を削除
	const handleClearAllOffline = useCallback(async () => {
		if (
			window.confirm(
				"すべてのオフライン動画を削除しますか？この操作は元に戻せません。",
			)
		) {
			try {
				await clearCache();
				await refreshCachedVideos();
			} catch (error) {
				console.error("Failed to clear offline cache:", error);
			}
		}
	}, [clearCache, refreshCachedVideos]);

	// 一覧表示ボタンのハンドラー
	const handleShowAll = useCallback(() => {
		setShowAll(true);
		setCurrentPage(1);
	}, []);

	// 検索実行
	const handleSearch = useCallback(() => {
		setSearchQuery(searchTerm);
		setCurrentPage(1);
		setShowAll(false);
	}, [searchTerm]);

	// 検索時にshowAllをリセット
	// useEffect(() => {
	// 	if (selectedGenre || selectedYear) {
	// 		setShowAll(false);
	// 	}
	// }, [selectedGenre, selectedYear]);

	// 検索クリア
	const clearSearch = () => {
		setSearchTerm("");
		setSearchQuery("");
	};

	// ページネーション
	const handlePageChange = useCallback((newPage: number) => {
		setCurrentPage(newPage);
	}, []);

	// エラーハンドリング
	const handleRetry = useCallback(async () => {
		await refetchVideos();
	}, [refetchVideos]);

	// ローディング状態 - 初期状態でのみフルスクリーンローディングを表示
	const hasContent =
		videos.length > 0 ||
		searchQuery ||
		// selectedGenre ||
		// selectedYear ||
		showAll;

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
			{/* モダンなヘッダーセクション */}
			<div className="bg-surface border-b border-border">
				<div className="container mx-auto px-6 py-6">
					{/* メインヘッダー */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
								<Play className="w-6 h-6 text-text-inverse" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-text flex items-center gap-3">
									My Video Storage
									{videosLoading && activeTab === "streaming" && (
										<div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
									)}
								</h1>
								<p className="text-sm text-text-secondary mt-1">
									{activeTab === "streaming" ? (
										videos.length === pagination.total ? (
											`${pagination.total} 動画`
										) : (
											`${videos.length} / ${pagination.total} 動画が見つかりました`
										)
									) : (
										<>
											{offlineVideos.length} 動画がオフラインで利用可能
											{cacheSize > 0 && ` (${formatFileSize(cacheSize)})`}
										</>
									)}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-4">
							{/* 設定ボタン */}
							<button
								type="button"
								onClick={() => setShowSettings(true)}
								className="flex items-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-text-secondary hover:text-text transition-all duration-200"
								title="設定"
							>
								<Settings className="h-4 w-4" />
								<span className="hidden sm:inline text-sm">設定</span>
							</button>

							{/* PWAインストールプロンプト */}
							<PWAInstallPrompt />

							{/* 表示モード切り替え */}
							<div className="flex bg-surface-elevated rounded-lg p-1">
								<button
									type="button"
									onClick={() => setViewMode("grid")}
									className={cn(
										"flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium",
										viewMode === "grid"
											? "bg-primary text-text-inverse shadow-sm"
											: "text-text-secondary hover:text-text hover:bg-surface",
									)}
								>
									<Grid className="h-4 w-4" />
									<span className="hidden sm:inline">グリッド</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode("list")}
									className={cn(
										"flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium",
										viewMode === "list"
											? "bg-primary text-text-inverse shadow-sm"
											: "text-text-secondary hover:text-text hover:bg-surface",
									)}
								>
									<List className="h-4 w-4" />
									<span className="hidden sm:inline">リスト</span>
								</button>
							</div>
						</div>
					</div>

					{/* タブナビゲーション */}
					<div className="flex bg-surface-elevated rounded-lg p-1 mb-6">
						<button
							type="button"
							onClick={() => handleTabChange("streaming")}
							className={cn(
								"flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-md transition-all duration-200 font-medium",
								activeTab === "streaming"
									? "bg-primary text-text-inverse shadow-sm"
									: "text-text-secondary hover:text-text hover:bg-surface",
							)}
						>
							<Wifi className="h-5 w-5" />
							<span>ストリーミング</span>
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("offline")}
							className={cn(
								"flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-md transition-all duration-200 font-medium relative",
								activeTab === "offline"
									? "bg-primary text-text-inverse shadow-sm"
									: "text-text-secondary hover:text-text hover:bg-surface",
							)}
						>
							<Download className="h-5 w-5" />
							<span>オフライン動画</span>
							{offlineVideos.length > 0 && (
								<span
									className={cn(
										"absolute -top-1 -right-1 px-2 py-0.5 text-xs rounded-full font-semibold",
										activeTab === "offline"
											? "bg-surface text-primary"
											: "bg-primary text-text-inverse",
									)}
								>
									{offlineVideos.length}
								</span>
							)}
						</button>
					</div>

					{/* 検索・フィルターセクション（ストリーミングタブのみ） */}
					{activeTab === "streaming" && (
						<div className="bg-surface-elevated rounded-lg p-4">
							<div className="flex flex-col lg:flex-row gap-4">
								{/* 検索入力 */}
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
									<input
										type="text"
										placeholder={`動画タイトルやファイル名で検索... (${SEARCH.MIN_QUERY_LENGTH}文字以上)`}
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										onCompositionStart={() => setIsComposing(true)}
										onCompositionEnd={() => setIsComposing(false)}
										onKeyDown={(e) => {
											if (
												e.key === "Enter" &&
												!isComposing &&
												searchTerm.trim().length >= SEARCH.MIN_QUERY_LENGTH
											) {
												handleSearch();
											}
										}}
										className="w-full pl-10 pr-24 py-3 bg-surface border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
									/>
									<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
										{searchTerm && (
											<button
												type="button"
												onClick={clearSearch}
												className="p-1 text-text-secondary hover:text-text transition-colors rounded-md hover:bg-surface-elevated"
											>
												<X className="h-4 w-4" />
											</button>
										)}
										<Button
											onClick={handleSearch}
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
										onChange={(e) => {
											setSortBy(e.target.value as SortBy);
											setCurrentPage(1);
										}}
										className="px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
									>
										<option value="title">タイトル順</option>
										<option value="year">年度順</option>
										<option value="episode">エピソード順</option>
										<option value="createdAt">作成日順</option>
									</select>

									<button
										type="button"
										onClick={() => {
											setSortOrder(sortOrder === "asc" ? "desc" : "asc");
											setCurrentPage(1);
										}}
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
					)}

					{/* オフライン管理パネル */}
					{activeTab === "offline" && (
						<div className="bg-surface-elevated rounded-lg p-4">
							<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
										<Download className="h-5 w-5 text-primary" />
									</div>
									<div>
										<h3 className="text-text font-semibold">
											オフライン動画管理
										</h3>
										<p className="text-sm text-text-secondary">
											{storageEstimate && (
												<>
													使用容量: {formatFileSize(storageEstimate.usage)} /{" "}
													{formatFileSize(storageEstimate.quota)} (
													{Math.round(
														(storageEstimate.usage / storageEstimate.quota) *
															100,
													)}
													%)
												</>
											)}
										</p>
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={refreshCachedVideos}
										variant="secondary"
										size="sm"
									>
										<RefreshCw className="h-4 w-4 mr-2" />
										更新
									</Button>
									{offlineVideos.length > 0 && (
										<Button
											onClick={handleClearAllOffline}
											variant="danger"
											size="sm"
										>
											<Trash2 className="h-4 w-4 mr-2" />
											すべて削除
										</Button>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* コンテンツエリア */}
			<div className="container mx-auto px-6 py-6">
				{/* コンテンツ */}
				{activeTab === "streaming" ? (
					// ストリーミングタブの内容
					videos.length === 0 &&
					!searchQuery &&
					// !selectedGenre &&
					// !selectedYear &&
					!showAll &&
					!videosLoading ? (
						// 初期状態 - 何も検索していない、一覧も表示していない
						<div className="text-center py-20">
							<div className="max-w-md mx-auto">
								<div className="mb-8">
									<div className="w-24 h-24 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center">
										<Search className="h-12 w-12 text-text-secondary" />
									</div>
									<h2 className="text-2xl font-bold text-text mb-4">
										動画ライブラリへようこそ
									</h2>
									<p className="text-text-secondary mb-8">
										検索フィールドから動画を検索するか、下のボタンで全ての動画を表示できます。
									</p>
								</div>
								<div className="space-y-4">
									<Button
										onClick={handleShowAll}
										disabled={videosLoading}
										className="w-full"
										size="lg"
									>
										{videosLoading ? "読み込み中..." : "すべての動画を表示"}
									</Button>
									<p className="text-sm text-text-muted">
										※ 多くの動画がある場合、読み込みに時間がかかる場合があります
									</p>
								</div>
							</div>
						</div>
					) : videosLoading && videos.length === 0 ? (
						// 読み込み中で動画がまだない場合
						<LoadingState type="search" message="動画を検索中..." />
					) : videos.length === 0 ? (
						// 検索結果やフィルタ結果がない場合
						<EmptyState type="no-search-results" searchTerm={searchQuery} />
					) : viewMode === "grid" ? (
						<VideoGridContainer
							videos={videos}
							onShowStreamingWarning={handleShowStreamingWarning}
						/>
					) : (
						<VideoList
							videos={videos}
							onShowStreamingWarning={handleShowStreamingWarning}
						/>
					)
				) : // オフラインタブの内容
				offlineVideos.length === 0 ? (
					<EmptyState type="no-offline-videos" />
				) : viewMode === "grid" ? (
					<VideoGridContainer
						videos={offlineVideos}
						isOfflineMode={true}
						onDelete={handleOfflineVideoDelete}
					/>
				) : (
					<VideoList
						videos={offlineVideos}
						isOfflineMode={true}
						onDelete={handleOfflineVideoDelete}
					/>
				)}

				{/* ページネーション */}
				{pagination.totalPages > 1 && (
					<div className="flex justify-center items-center space-x-4 mt-8">
						<Button
							onClick={() => handlePageChange(currentPage - 1)}
							disabled={!hasPrevPage || videosLoading}
							variant="secondary"
							size="sm"
						>
							前のページ
						</Button>

						<span className="text-text">
							{pagination.page} / {pagination.totalPages} ページ (
							{pagination.total}件中{" "}
							{(pagination.page - 1) * pagination.limit + 1}-
							{Math.min(pagination.page * pagination.limit, pagination.total)}
							件)
						</span>

						<Button
							onClick={() => handlePageChange(currentPage + 1)}
							disabled={!hasNextPage || videosLoading}
							variant="secondary"
							size="sm"
						>
							次のページ
						</Button>
					</div>
				)}
			</div>
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
			<SettingsModal
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
			/>
		</main>
	);
};

export default Home;
