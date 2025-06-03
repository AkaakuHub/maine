"use client";

import { useState, useCallback } from "react";
import { useVideos } from "@/hooks/useVideos";
import VideoGridContainer from "@/components/VideoGridContainer";
import VideoList from "@/components/VideoList";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { Button } from "@/components/ui/Button";

// 型定義
export type ViewMode = "grid" | "list";
export type SortBy = "title" | "year" | "episode" | "createdAt" | "lastWatched";
export type SortOrder = "asc" | "desc";

const VideoGrid = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortBy>("title");
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
	const [selectedGenre, setSelectedGenre] = useState("");
	const [selectedYear, setSelectedYear] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

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
			search: searchTerm || undefined,
			genre: selectedGenre || undefined,
			year: selectedYear || undefined,
		},
		sorting: {
			sortBy,
			sortOrder,
		},
		pagination: {
			page: currentPage,
			limit: 50,
		},
	});

	// ページネーション
	const handlePageChange = useCallback((newPage: number) => {
		setCurrentPage(newPage);
	}, []);

	// エラーハンドリング
	const handleRetry = useCallback(async () => {
		await refetchVideos();
	}, [refetchVideos]);

	// ローディング状態
	if (videosLoading && videos.length === 0) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				<LoadingState
					type="initial"
					message="動画ファイルを検索しています..."
				/>
			</div>
		);
	}

	// エラー状態
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
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
			<div className="relative container mx-auto px-4 py-8">
				{/* 検索とフィルター */}
				<div className="mb-8 p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
					<div className="flex flex-col gap-4">
						{/* 検索バー */}
						<div className="flex gap-4">
							<input
								type="text"
								placeholder="動画を検索..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
							/>
						</div>

						{/* ビューモード切り替え */}
						<div className="flex gap-2">
							<Button
								onClick={() => setViewMode("grid")}
								variant={viewMode === "grid" ? "primary" : "secondary"}
							>
								グリッド
							</Button>
							<Button
								onClick={() => setViewMode("list")}
								variant={viewMode === "list" ? "primary" : "secondary"}
							>
								リスト
							</Button>
						</div>

						{/* 結果表示 */}
						{pagination.total > 0 && (
							<div className="text-sm text-slate-400">
								{pagination.total}件中 {videos.length}件を表示
							</div>
						)}
					</div>
				</div>

				{/* コンテンツ */}
				{videos.length === 0 ? (
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
		</div>
	);
};

export default VideoGrid;
