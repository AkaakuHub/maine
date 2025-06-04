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
} from "lucide-react";
import { useVideos } from "@/hooks/useVideos";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import VideoGridContainer from "@/components/VideoGridContainer";
import VideoList from "@/components/VideoList";
import OfflineVideoCard from "@/components/OfflineVideoCard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import StreamingWarningDialog from "@/components/StreamingWarningDialog";
import { Button } from "@/components/ui/Button";
import { cn, formatFileSize } from "@/libs/utils";
import { PAGINATION, SEARCH } from "@/utils/constants";
import type { VideoFileData } from "@/type";

export type ViewMode = "grid" | "list";
export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";
export type TabType = "streaming" | "offline";

const Home = () => {
	// UI状態
	const [activeTab, setActiveTab] = useState<TabType>("streaming");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchQuery, setSearchQuery] = useState(""); // 実際の検索クエリ
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortBy>("title");
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
	const [selectedGenre, setSelectedGenre] = useState("");
	const [selectedYear, setSelectedYear] = useState("");
	const [currentPage, setCurrentPage] = useState(1); // IME状態管理
	const [isComposing, setIsComposing] = useState(false);
	const [showAll, setShowAll] = useState(false); // 一覧表示フラグ

	// 警告ダイアログの状態
	const [showStreamingWarning, setShowStreamingWarning] = useState(false);
	const [warningVideoData, setWarningVideoData] =
		useState<VideoFileData | null>(null);
	// 動画データのフック
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
			genre: selectedGenre || undefined,
			year: selectedYear || undefined,
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
	});

	// オフラインストレージのフック
	const {
		cachedVideos,
		cacheSize,
		storageEstimate,
		clearCache,
		refreshCachedVideos,
		deleteVideo: deleteOfflineVideo,
	} = useOfflineStorage();
	// オフラインビデオをVideoFileData形式に変換
	const offlineVideos: VideoFileData[] = cachedVideos.map((cached, index) => ({
		id: `offline-${index}`,
		filePath: cached.filePath,
		title: cached.title,
		fileName: cached.title,
		fileSize: cached.size,
		year: undefined,
		episode: undefined,
		isLiked: false,
		watchProgress: 0,
		watchTime: 0,
		duration: cached.duration,
		lastWatched: undefined,
	}));
	// タブ切り替え時にページをリセット
	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		setCurrentPage(1);
		setSearchTerm("");
		setSearchQuery("");
		if (tab === "offline") {
			refreshCachedVideos();
		}
	};

	// オフライン動画の削除処理
	const handleOfflineVideoDelete = useCallback(
		async (filePath: string) => {
			await refreshCachedVideos();
		},
		[refreshCachedVideos],
	);

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
	useEffect(() => {
		if (selectedGenre || selectedYear) {
			setShowAll(false);
		}
	}, [selectedGenre, selectedYear]);

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
		selectedGenre ||
		selectedYear ||
		showAll;

	if (videosLoading && !hasContent) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				<LoadingState type="initial" message="検索中..." />
			</div>
		);
	}

	if (videosError) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				<div className="container mx-auto px-4 py-8">
					<EmptyState type="loading-error" onRetry={handleRetry} />
				</div>
			</div>
		);
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
			{/* 背景装飾 */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-slate-900" />
			<div
				className="absolute inset-0 opacity-30"
				style={{
					backgroundImage:
						"url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBmaWxsPSJub25lIj4KPC9zdmc+')",
				}}
			/>{" "}
			<div className="relative container mx-auto px-4 py-8">
				{/* 統合ヘッダー */}
				<div className="mb-8 space-y-4">
					{/* メインヘッダー */}
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
									My Video Storage
								</h1>{" "}
								{/* ローディングインジケーター */}
								{videosLoading && activeTab === "streaming" && (
									<div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
								)}
							</div>
							<p className="text-slate-400 mt-2">
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

						{/* 表示モード切り替え */}
						<div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={cn(
									"flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
									viewMode === "grid"
										? "bg-blue-500 text-white shadow-lg"
										: "text-slate-400 hover:text-white hover:bg-slate-700/50",
								)}
							>
								<Grid className="h-4 w-4" />
								<span className="hidden sm:inline">グリッド</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("list")}
								className={cn(
									"flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
									viewMode === "list"
										? "bg-blue-500 text-white shadow-lg"
										: "text-slate-400 hover:text-white hover:bg-slate-700/50",
								)}
							>
								<List className="h-4 w-4" />
								<span className="hidden sm:inline">リスト</span>
							</button>
						</div>
					</div>
					{/* タブナビゲーション */}
					<div className="bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
						<div className="flex">
							<button
								type="button"
								onClick={() => handleTabChange("streaming")}
								className={cn(
									"flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all duration-200",
									activeTab === "streaming"
										? "bg-blue-500 text-white"
										: "text-slate-400 hover:text-white hover:bg-slate-700/50",
								)}
							>
								<Wifi className="h-5 w-5" />
								<span className="font-medium">ストリーミング</span>
							</button>
							<button
								type="button"
								onClick={() => handleTabChange("offline")}
								className={cn(
									"flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all duration-200 relative",
									activeTab === "offline"
										? "bg-green-500 text-white"
										: "text-slate-400 hover:text-white hover:bg-slate-700/50",
								)}
							>
								<Download className="h-5 w-5" />
								<span className="font-medium">オフライン動画</span>
								{offlineVideos.length > 0 && (
									<span
										className={cn(
											"absolute -top-1 -right-1 px-2 py-1 text-xs rounded-full",
											activeTab === "offline"
												? "bg-white text-green-500"
												: "bg-green-500 text-white",
										)}
									>
										{offlineVideos.length}
									</span>
								)}
							</button>
						</div>
					</div>{" "}
					{/* 検索バー（ストリーミングタブのみ） */}
					{activeTab === "streaming" && (
						<div className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
							<div className="flex flex-col sm:flex-row gap-4">
								{/* 検索入力 */}
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
									<input
										type="text"
										placeholder={`動画タイトルやファイル名で検索... (${SEARCH.MIN_QUERY_LENGTH}文字以上)`}
										value={searchTerm}
										onChange={(e) => {
											setSearchTerm(e.target.value);
										}}
										onCompositionStart={() => setIsComposing(true)}
										onCompositionEnd={() => setIsComposing(false)}
										onKeyDown={(e) => {
											// IMEの変換確定時のEnterキーを除外
											if (
												e.key === "Enter" &&
												!isComposing &&
												searchTerm.trim().length >= SEARCH.MIN_QUERY_LENGTH
											) {
												handleSearch();
											}
										}}
										className="w-full pl-10 pr-20 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									/>
									<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
										{searchTerm && (
											<button
												type="button"
												onClick={clearSearch}
												className="h-5 w-5 text-slate-400 hover:text-white transition-colors"
											>
												<X className="h-5 w-5" />
											</button>
										)}
										<Button
											onClick={handleSearch}
											disabled={
												!searchTerm.trim() ||
												searchTerm.trim().length < SEARCH.MIN_QUERY_LENGTH
											}
											size="sm"
											className="h-8 px-3"
										>
											検索
										</Button>
									</div>
									{/* 検索ヘルプメッセージ */}
									{searchTerm &&
										searchTerm.trim().length > 0 &&
										searchTerm.trim().length < SEARCH.MIN_QUERY_LENGTH && (
											<p className="absolute -bottom-6 left-0 text-xs text-yellow-400">
												検索には{SEARCH.MIN_QUERY_LENGTH}
												文字以上入力してください
											</p>
										)}
								</div>

								{/* ソートとフィルター */}
								<div className="flex gap-2">
									{/* ソート選択 */}
									<select
										value={sortBy}
										onChange={(e) => {
											setSortBy(e.target.value as SortBy);
											setCurrentPage(1);
										}}
										className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									>
										<option value="title">タイトル順</option>
										<option value="year">年度順</option>
										<option value="episode">エピソード順</option>
										<option value="createdAt">作成日順</option>
									</select>

									{/* ソート順切り替え */}
									<button
										type="button"
										onClick={() => {
											setSortOrder(sortOrder === "asc" ? "desc" : "asc");
											setCurrentPage(1);
										}}
										className={cn(
											"flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
											"bg-slate-900/50 border border-slate-600 text-white hover:bg-slate-700/50",
										)}
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
						</div>
					)}
					{/* オフライン管理パネル */}
					{activeTab === "offline" && (
						<div className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
							<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="text-green-400">
										<Download className="h-5 w-5" />
									</div>
									<div>
										<h3 className="text-white font-medium">
											オフライン動画管理
										</h3>
										<p className="text-sm text-slate-400">
											{storageEstimate && (
												<>
													使用容量: {formatFileSize(storageEstimate.usage)} /{" "}
													{formatFileSize(storageEstimate.quota)}(
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
									{" "}
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

				{/* コンテンツ */}
				{activeTab === "streaming" ? (
					// ストリーミングタブの内容
					videos.length === 0 &&
					!searchQuery &&
					!selectedGenre &&
					!selectedYear &&
					!showAll &&
					!videosLoading ? (
						// 初期状態 - 何も検索していない、一覧も表示していない
						<div className="text-center py-20">
							<div className="max-w-md mx-auto">
								<div className="mb-8">
									<div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
										<Search className="h-12 w-12 text-slate-400" />
									</div>
									<h2 className="text-2xl font-bold text-white mb-4">
										動画ライブラリへようこそ
									</h2>
									<p className="text-slate-400 mb-8">
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
									<p className="text-sm text-slate-500">
										※
										4000件以上の動画がある場合、読み込みに時間がかかる場合があります
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

						<span className="text-white">
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
		</main>
	);
};

export default Home;
