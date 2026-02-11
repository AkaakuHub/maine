"use client";

import VideoGridContainer from "../../components/VideoGridContainer";
import VideoList from "../../components/VideoList";
import Button from "../../components/ui/Button";
import type { ViewMode } from "../../stores/appStateStore";
import type { VideoFileData } from "../../type";
import { EmptyState } from "../EmptyState";
import { LoadingState } from "../LoadingState";

interface PaginationData {
	total: number;
	page: number;
	totalPages: number;
	limit: number;
}

interface VideoContentProps {
	viewMode: ViewMode;
	videos: VideoFileData[];
	videosLoading: boolean;
	searchQuery: string;
	hasContent: boolean;
	pagination: PaginationData;
	currentPage: number;
	hasPrevPage: boolean;
	hasNextPage: boolean;
	onShowStreamingWarning: (video: VideoFileData) => void;
	onPageChange: (page: number) => void;
	onPlay?: (id: string) => void;
	onRetry?: () => void;
}

export function VideoContent({
	viewMode,
	videos,
	videosLoading,
	searchQuery,
	hasContent,
	pagination,
	currentPage,
	hasPrevPage,
	hasNextPage,
	onShowStreamingWarning,
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
				if (videosLoading) {
					return <LoadingState type="search" message="動画を読み込み中..." />;
				}

				if (videos.length === 0 && searchQuery) {
					return (
						<EmptyState type="no-search-results" searchTerm={searchQuery} />
					);
				}

				if (videos.length === 0 && !videosLoading) {
					return <EmptyState type="no-videos" />;
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
