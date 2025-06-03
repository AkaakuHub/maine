"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Grid, List, X, Filter, SortAsc, SortDesc } from "lucide-react";
import { useDatabaseUpdate } from "@/hooks/useDatabaseUpdate";
import { useVideos } from "@/hooks/useVideos";
import VideoGridContainer from "@/components/VideoGridContainer";
import VideoList from "@/components/VideoList";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/libs/utils";
import { PAGINATION, SEARCH } from "@/utils/constants";

export type ViewMode = "grid" | "list";
export type SortBy = "title" | "year" | "episode" | "createdAt";
export type SortOrder = "asc" | "desc";

const Home = () => {
	// UI状態
	const [searchTerm, setSearchTerm] = useState("");
	const [searchQuery, setSearchQuery] = useState(""); // 実際の検索クエリ
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortBy>("title");
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
	const [selectedGenre, setSelectedGenre] = useState("");
	const [selectedYear, setSelectedYear] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [showAll, setShowAll] = useState(false); // 一覧表示フラグ

	// アニメデータのフック
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
			search: searchQuery || undefined, // searchQueryを使用
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
		loadAll: showAll, // 明示的な一覧読み込み
	});
	// データベース更新のフック
	const {
		updating,
		error: updateError,
		stats,
		updateDatabase,
		clearError,
	} = useDatabaseUpdate();
	// データベース更新
	const handleDatabaseUpdate = useCallback(async () => {
		const success = await updateDatabase();
		if (success) {
			// 更新成功後、現在の表示状態に応じて再フェッチ
			if (showAll || searchQuery) {
				await refetchVideos();
			}
		}
	}, [updateDatabase, showAll, searchQuery, refetchVideos]);
	// 一覧表示ボタンのハンドラー
	const handleShowAll = useCallback(() => {
		console.log("[HomePage] Show all button clicked");
		setShowAll(true);
		setCurrentPage(1);
	}, []); // 検索実行
	const handleSearch = useCallback(() => {
		console.log("[HomePage] Search button clicked with:", searchTerm);
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
		clearError();
		await refetchVideos();
	}, [clearError, refetchVideos]); // ローディング状態 - 初期状態でのみフルスクリーンローディングを表示
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

	if (updateError || videosError) {
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
			/>

			<div className="relative container mx-auto px-4 py-8">
				{/* 統合ヘッダー */}
				<div className="mb-8 space-y-4">
					{/* メインヘッダー */}
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
									My Video Storage
								</h1>
								{/* ローディングインジケーター */}
								{videosLoading && (
									<div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
								)}
							</div>
							<p className="text-slate-400 mt-2">
								{videos.length === pagination.total
									? `${pagination.total} アニメ`
									: `${videos.length} / ${pagination.total} アニメが見つかりました`}
							</p>
						</div>

						{/* データベース更新ボタンと表示モード切り替え */}
						<div className="flex items-center gap-4">
							<Button
								onClick={handleDatabaseUpdate}
								loading={updating}
								disabled={updating}
								variant="secondary"
								size="sm"
							>
								{updating ? "更新中..." : "DB更新"}
							</Button>

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
					</div>{" "}
					{/* 検索バー */}
					<div className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
						<div className="flex flex-col sm:flex-row gap-4">
							{/* 検索入力 */}
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
								<input
									type="text"
									placeholder={`アニメタイトルやファイル名で検索... (${SEARCH.MIN_QUERY_LENGTH}文字以上)`}
									value={searchTerm}
									onChange={(e) => {
										setSearchTerm(e.target.value);
									}}
									onKeyDown={(e) => {
										if (
											e.key === "Enter" &&
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
										検索{" "}
									</Button>
								</div>
								{/* 検索ヘルプメッセージ */}
								{searchTerm &&
									searchTerm.trim().length > 0 &&
									searchTerm.trim().length < SEARCH.MIN_QUERY_LENGTH && (
										<p className="absolute -bottom-6 left-0 text-xs text-yellow-400">
											検索には{SEARCH.MIN_QUERY_LENGTH}文字以上入力してください
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
					{/* 更新統計表示 */}
					{stats && (
						<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
							<p>
								データベース更新完了: 追加 {stats.added}件, 更新 {stats.updated}
								件, 削除 {stats.deleted}件 (全{stats.total}件)
							</p>
						</div>
					)}
					{/* エラー表示 */}
					{updateError && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
							<p>エラー: {updateError}</p>
						</div>
					)}
				</div>{" "}
				{/* コンテンツ */}
				{videos.length === 0 &&
				!searchTerm &&
				!selectedGenre &&
				!selectedYear &&
				!showAll ? (
					// 初期状態 - 何も検索していない、一覧も表示していない
					<div className="text-center py-20">
						<div className="max-w-md mx-auto">
							<div className="mb-8">
								<div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
									<Search className="h-12 w-12 text-slate-400" />
								</div>
								<h2 className="text-2xl font-bold text-white mb-4">
									アニメライブラリへようこそ
								</h2>
								<p className="text-slate-400 mb-8">
									検索フィールドからアニメを検索するか、下のボタンで全ての動画を表示できます。
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
				) : videos.length === 0 ? (
					<EmptyState type="no-search-results" searchTerm={searchTerm} />
				) : viewMode === "grid" ? (
					<VideoGridContainer videos={videos} />
				) : (
					<VideoList videos={videos} />
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
		</main>
	);
};

export default Home;
