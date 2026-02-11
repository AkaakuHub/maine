"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import VideoCard from "../../components/VideoCard";
import { VideoListItem } from "../../components/VideoList";
import { cn } from "../../libs/utils";
import type { ViewMode } from "../../stores/appStateStore";
import type { VideoFileData } from "../../type";
import { INFINITE_SCROLL } from "../../utils/constants";
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
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onShowStreamingWarning: (video: VideoFileData) => void;
	onLoadNextPage: () => Promise<void>;
	onPlay?: (id: string) => void;
	onRetry?: () => void;
}

const resolveGridColumns = (screenWidth: number): number => {
	for (const rule of INFINITE_SCROLL.GRID_COLUMN_BREAKPOINTS) {
		if (screenWidth >= rule.minWidth) {
			return rule.columns;
		}
	}

	return 1;
};

const createGridRows = (
	videos: VideoFileData[],
	columns: number,
): VideoFileData[][] => {
	const rows: VideoFileData[][] = [];

	for (let index = 0; index < videos.length; index += columns) {
		rows.push(videos.slice(index, index + columns));
	}

	return rows;
};

export function VideoContent({
	viewMode,
	videos,
	videosLoading,
	searchQuery,
	hasContent,
	pagination,
	hasNextPage,
	isFetchingNextPage,
	onShowStreamingWarning,
	onLoadNextPage,
	onPlay,
}: VideoContentProps) {
	const [gridColumns, setGridColumns] = useState(1);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const syncColumns = () => {
			setGridColumns(resolveGridColumns(window.innerWidth));
		};

		syncColumns();
		window.addEventListener("resize", syncColumns);

		return () => {
			window.removeEventListener("resize", syncColumns);
		};
	}, []);

	const gridRows = useMemo(
		() => createGridRows(videos, Math.max(1, gridColumns)),
		[videos, gridColumns],
	);

	if (videosLoading && !hasContent) {
		return <LoadingState type="initial" message="検索中..." />;
	}

	if (videos.length === 0 && searchQuery) {
		return (
			<div className="container mx-auto px-6 py-6">
				<EmptyState type="no-search-results" searchTerm={searchQuery} />
			</div>
		);
	}

	if (videos.length === 0 && !videosLoading) {
		return (
			<div className="container mx-auto px-6 py-6">
				<EmptyState type="no-videos" />
			</div>
		);
	}

	const handleEndReached = () => {
		if (hasNextPage && !isFetchingNextPage) {
			void onLoadNextPage();
		}
	};

	const handleAtBottomStateChange = (isAtBottom: boolean) => {
		if (isAtBottom && hasNextPage && !isFetchingNextPage) {
			void onLoadNextPage();
		}
	};

	const Footer = () => {
		if (isFetchingNextPage) {
			return (
				<div className="container mx-auto px-6 py-6">
					<div className="flex items-center justify-center gap-2 text-text-secondary">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span className="text-sm">読み込み中...</span>
					</div>
				</div>
			);
		}

		if (!hasNextPage && pagination.total > 0) {
			return (
				<div className="container mx-auto px-6 pb-8">
					<p className="text-center text-sm text-text-secondary">
						全 {pagination.total} 件を表示しました
					</p>
				</div>
			);
		}

		return <div className="h-6" />;
	};

	if (viewMode === "grid") {
		return (
			<div className="pb-6">
				<Virtuoso
					useWindowScroll
					data={gridRows}
					endReached={handleEndReached}
					atBottomStateChange={handleAtBottomStateChange}
					increaseViewportBy={INFINITE_SCROLL.GRID_OVERSCAN}
					components={{ Footer }}
					itemContent={(rowIndex, rowVideos) => (
						<div className="container mx-auto px-6">
							<div
								className={cn(rowIndex === 0 ? "pt-6" : "", "pb-6 grid gap-6")}
								style={{
									gridTemplateColumns: `repeat(${Math.max(1, gridColumns)}, minmax(0, 1fr))`,
								}}
							>
								{rowVideos.map((video, columnIndex) => (
									<VideoCard
										key={video.id}
										video={video}
										priority={rowIndex === 0 && columnIndex < 6}
										onShowStreamingWarning={onShowStreamingWarning}
										onPlay={onPlay}
									/>
								))}
							</div>
						</div>
					)}
				/>
			</div>
		);
	}

	return (
		<div className="pb-6">
			<Virtuoso
				useWindowScroll
				data={videos}
				endReached={handleEndReached}
				atBottomStateChange={handleAtBottomStateChange}
				increaseViewportBy={INFINITE_SCROLL.LIST_OVERSCAN}
				components={{ Footer }}
				itemContent={(index, video) => (
					<div className="container mx-auto px-6">
						<div className={cn(index === 0 ? "pt-6" : "", "pb-3")}>
							<VideoListItem
								video={video}
								onShowStreamingWarning={onShowStreamingWarning}
								onPlay={onPlay}
							/>
						</div>
					</div>
				)}
			/>
		</div>
	);
}
