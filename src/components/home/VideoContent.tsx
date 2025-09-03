"use client";

import { Search } from "lucide-react";
import VideoGridContainer from "@/components/VideoGridContainer";
import VideoList from "@/components/VideoList";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { Button } from "@/components/ui/Button";
import type { VideoFileData } from "@/type";
import type { ViewMode, TabType } from "@/stores/appStateStore";

interface PaginationData {
	total: number;
	page: number;
	totalPages: number;
	limit: number;
}

interface VideoContentProps {
	activeTab: TabType;
	viewMode: ViewMode;
	videos: VideoFileData[];
	offlineVideos: VideoFileData[];
	videosLoading: boolean;
	searchQuery: string;
	showAll: boolean;
	hasContent: boolean;
	pagination: PaginationData;
	currentPage: number;
	hasPrevPage: boolean;
	hasNextPage: boolean;
	onShowStreamingWarning: (video: VideoFileData) => void;
	onShowAll: () => void;
	onOfflineVideoDelete: () => void;
	onPageChange: (page: number) => void;
}

export function VideoContent({
	activeTab,
	viewMode,
	videos,
	offlineVideos,
	videosLoading,
	searchQuery,
	showAll,
	hasContent,
	pagination,
	currentPage,
	hasPrevPage,
	hasNextPage,
	onShowStreamingWarning,
	onShowAll,
	onOfflineVideoDelete,
	onPageChange,
}: VideoContentProps) {
	// ローディング状態 - 初期状態でのみフルスクリーンローディングを表示
	if (videosLoading && !hasContent) {
		return <LoadingState type="initial" message="検索中..." />;
	}

	return (
		<div className="container mx-auto px-6 py-6">
			{/* コンテンツ */}
			{activeTab === "streaming" ? (
				// ストリーミングタブの内容
				videos.length === 0 && !searchQuery && !showAll && !videosLoading ? (
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
									onClick={onShowAll}
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
						onShowStreamingWarning={onShowStreamingWarning}
					/>
				) : (
					<VideoList
						videos={videos}
						onShowStreamingWarning={onShowStreamingWarning}
					/>
				)
			) : // オフラインタブの内容
			offlineVideos.length === 0 ? (
				<EmptyState type="no-offline-videos" />
			) : viewMode === "grid" ? (
				<VideoGridContainer
					videos={offlineVideos}
					isOfflineMode={true}
					onDelete={onOfflineVideoDelete}
				/>
			) : (
				<VideoList
					videos={offlineVideos}
					isOfflineMode={true}
					onDelete={onOfflineVideoDelete}
				/>
			)}

			{/* ページネーション */}
			{pagination.totalPages > 1 && (
				<div className="flex justify-center items-center space-x-4 mt-8">
					<Button
						onClick={() => onPageChange(currentPage - 1)}
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
						onClick={() => onPageChange(currentPage + 1)}
						disabled={!hasNextPage || videosLoading}
						variant="secondary"
						size="sm"
					>
						次のページ
					</Button>
				</div>
			)}
		</div>
	);
}
