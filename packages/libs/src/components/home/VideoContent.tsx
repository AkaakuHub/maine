"use client";

import { Search } from "lucide-react";
import VideoGridContainer from "../../components/VideoGridContainer";
import VideoList from "../../components/VideoList";
import Button from "../../components/ui/Button";
import type { VideoFileData } from "../../type";
import type { ViewMode, TabType } from "../../stores/appStateStore";
import { LoadingState } from "../LoadingState";
import { EmptyState } from "../EmptyState";

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
	onPlay?: (videoId: string, isOffline?: boolean) => void;
	onRetry?: () => void;
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
	onPlay,
}: VideoContentProps) {
	// ローディング状態 - 初期状態でのみフルスクリーンローディングを表示
	if (videosLoading && !hasContent) {
		return <LoadingState type="initial" message="検索中..." />;
	}

	return (
		<div className="container mx-auto px-6 py-6">
			{/* コンテンツ */}
			{(() => {
				if (activeTab === "streaming") {
					if (videosLoading) {
						return <LoadingState type="search" message="動画を読み込み中..." />;
					}

					if (videos.length === 0 && searchQuery) {
						return (
							<EmptyState type="no-search-results" searchTerm={searchQuery} />
						);
					}

					if (videos.length === 0 && showAll && !videosLoading) {
						return <EmptyState type="no-videos" />;
					}

					if (videos.length === 0) {
						return (
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
											※
											多くの動画がある場合、読み込みに時間がかかる場合があります
										</p>
									</div>
								</div>
							</div>
						);
					}

					// 動画がある場合は表示
					return viewMode === "grid" ? (
						<VideoGridContainer
							videos={videos}
							onShowStreamingWarning={onShowStreamingWarning}
							onPlay={onPlay}
						/>
					) : (
						<VideoList
							videos={videos}
							onShowStreamingWarning={onShowStreamingWarning}
							onPlay={onPlay}
						/>
					);
				}

				// オフラインタブの内容
				if (offlineVideos.length === 0) {
					return <EmptyState type="no-offline-videos" />;
				}

				return viewMode === "grid" ? (
					<VideoGridContainer
						videos={offlineVideos}
						isOfflineMode={true}
						onDelete={onOfflineVideoDelete}
						onPlay={onPlay}
					/>
				) : (
					<VideoList
						videos={offlineVideos}
						isOfflineMode={true}
						onDelete={onOfflineVideoDelete}
						onPlay={onPlay}
					/>
				);
			})()}

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
