"use client";

import { useState, useCallback } from "react";
import { useAnimes } from "@/hooks/useAnimes";
import { useDatabaseUpdate } from "@/hooks/useDatabaseUpdate";
import AnimeGrid from "@/components/AnimeGrid";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import SearchAndFilterBar, { type SearchFilters } from "@/components/features/SearchAndFilterBar/SearchAndFilterBar";
import { Button } from "@/components/ui/Button";

const Home = () => {
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({
    search: '',
    genre: '',
    year: '',
    sortBy: 'title',
    sortOrder: 'asc'
  });

  const [currentPage, setCurrentPage] = useState(1);

  // アニメデータのフック
  const {
    animes,
    loading: animesLoading,
    error: animesError,
    pagination,
    refetch: refetchAnimes,
    hasNextPage,
    hasPrevPage
  } = useAnimes({
    filters: {
      search: currentFilters.search || undefined,
      genre: currentFilters.genre || undefined,
      year: currentFilters.year || undefined
    },
    sorting: {
      sortBy: currentFilters.sortBy,
      sortOrder: currentFilters.sortOrder
    },
    pagination: {
      page: currentPage,
      limit: 50
    }
  });

  // データベース更新のフック
  const {
    updating,
    error: updateError,
    stats,
    updateDatabase,
    clearError
  } = useDatabaseUpdate();

  // 検索・フィルタの処理
  const handleSearch = useCallback((filters: SearchFilters) => {
    setCurrentFilters(filters);
    setCurrentPage(1); // 検索時はページを1に戻す
  }, []);

  // ページネーション
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // データベース更新
  const handleDatabaseUpdate = useCallback(async () => {
    const success = await updateDatabase();
    if (success) {
      // 更新成功時にアニメデータも再取得
      await refetchAnimes();
    }
  }, [updateDatabase, refetchAnimes]);

  // エラーハンドリング
  const handleRetry = useCallback(async () => {
    clearError();
    await refetchAnimes();
  }, [clearError, refetchAnimes]);

  if (animesLoading && animes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingState type="initial" message="動画ファイルを検索しています..." />
      </div>
    );
  }

  if (animesError) {
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
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-white">
              My Anime Storage
            </h1>
            <Button
              onClick={handleDatabaseUpdate}
              loading={updating}
              disabled={updating}
              variant="secondary"
            >
              {updating ? 'データベース更新中...' : 'データベース更新'}
            </Button>
          </div>

          {/* 更新統計表示 */}
          {stats && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p>
                データベース更新完了: 追加 {stats.added}件, 更新 {stats.updated}件, 削除 {stats.deleted}件
                (全{stats.total}件)
              </p>
            </div>
          )}

          {/* エラー表示 */}
          {updateError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>エラー: {updateError}</p>
            </div>
          )}
        </div>

        {/* 検索・フィルタバー */}
        <SearchAndFilterBar
          onSearch={handleSearch}
          loading={animesLoading}
          className="mb-8"
        />

        {/* コンテンツ */}
        {animes.length === 0 ? (
          <EmptyState type="no-search-results" />
        ) : (
          <>
            {/* アニメグリッド */}
            <AnimeGrid animes={animes} />

            {/* ページネーション */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage || animesLoading}
                  variant="secondary"
                  size="sm"
                >
                  前のページ
                </Button>

                <span className="text-white">
                  {pagination.page} / {pagination.totalPages} ページ
                  ({pagination.total}件中 {((pagination.page - 1) * pagination.limit) + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}件)
                </span>

                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage || animesLoading}
                  variant="secondary"
                  size="sm"
                >
                  次のページ
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Home;
