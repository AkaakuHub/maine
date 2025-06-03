import type React from 'react'
import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { UI } from '@/utils/constants'

export interface SearchAndFilterBarProps {
  onSearch: (filters: SearchFilters) => void
  loading?: boolean
  className?: string
}

export interface SearchFilters {
  search?: string
  genre?: string
  year?: string
  sortBy: 'title' | 'year' | 'episode' | 'createdAt' | 'lastWatched'
  sortOrder: 'asc' | 'desc'
}

const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  onSearch,
  loading = false,
  className = ''
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    genre: '',
    year: '',
    sortBy: 'title',
    sortOrder: 'asc'
  })

  // デバウンス用のタイマー
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // デバウンスされた検索実行
  const debouncedSearch = useCallback((newFilters: SearchFilters) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      onSearch(newFilters)
    }, UI.DEBOUNCE_DELAY)

    setDebounceTimer(timer)
  }, [debounceTimer, onSearch])

  // フィルターを更新
  const updateFilter = useCallback((key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // 検索とジャンルは即座に反映、その他は手動実行
    if (key === 'search' || key === 'genre') {
      debouncedSearch(newFilters)
    }
  }, [filters, debouncedSearch])

  // 年の選択肢を生成
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= 1990; year--) {
      years.push(year)
    }
    return years
  }, [])

  // フィルターをリセット
  const resetFilters = useCallback(() => {
    const resetFilters: SearchFilters = {
      search: '',
      genre: '',
      year: '',
      sortBy: 'title',
      sortOrder: 'asc'
    }
    setFilters(resetFilters)
    onSearch(resetFilters)
  }, [onSearch])

  // 手動で検索実行
  const handleSearch = useCallback(() => {
    onSearch(filters)
  }, [filters, onSearch])

  return (
    <div className={`bg-white shadow-sm border border-gray-200 rounded-lg p-4 space-y-4 ${className}`}>
      {/* 検索バー */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            id="search"
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="タイトルまたはファイル名で検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
        
        <div className="w-48">
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
            ジャンル
          </label>
          <input
            id="genre"
            type="text"
            value={filters.genre}
            onChange={(e) => updateFilter('genre', e.target.value)}
            placeholder="ジャンルで絞り込み..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
        
        <div className="w-32">
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            年
          </label>
          <select
            id="year"
            value={filters.year}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">全て</option>
            {yearOptions.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ソートオプション */}
      <div className="flex gap-4 items-end">
        <div className="w-48">
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            並び順
          </label>
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="title">タイトル</option>
            <option value="year">年</option>
            <option value="episode">エピソード</option>
            <option value="createdAt">登録日</option>
            <option value="lastWatched">最終視聴日</option>
          </select>
        </div>
        
        <div className="w-32">
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
            順序
          </label>
          <select
            id="sortOrder"
            value={filters.sortOrder}
            onChange={(e) => updateFilter('sortOrder', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="asc">昇順</option>
            <option value="desc">降順</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            loading={loading}
            disabled={loading}
          >
            検索
          </Button>
          
          <Button
            variant="secondary"
            onClick={resetFilters}
            disabled={loading}
          >
            リセット
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SearchAndFilterBar 