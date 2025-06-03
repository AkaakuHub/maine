import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AnimeData } from '@/type'
import { API } from '@/utils/constants'

export interface UseAnimesFilters {
  search?: string
  genre?: string
  year?: string
}

export interface UseAnimesSorting {
  sortBy: 'title' | 'year' | 'episode' | 'createdAt' | 'lastWatched'
  sortOrder: 'asc' | 'desc'
}

export interface UseAnimesPagination {
  page: number
  limit: number
}

export interface UseAnimesOptions {
  filters?: UseAnimesFilters
  sorting?: UseAnimesSorting
  pagination?: UseAnimesPagination
  enabled?: boolean
}

export interface UseAnimesReturn {
  animes: AnimeData[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  refetch: () => Promise<void>
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function useAnimes(options: UseAnimesOptions = {}): UseAnimesReturn {
  const {
    filters = {},
    sorting = { sortBy: 'title', sortOrder: 'asc' },
    pagination = { page: 1, limit: 50 },
    enabled = true
  } = options

  const [animes, setAnimes] = useState<AnimeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paginationInfo, setPaginationInfo] = useState({
    page: pagination.page,
    limit: pagination.limit,
    total: 0,
    totalPages: 0
  })

  // URLパラメータを構築
  const searchParams = useMemo(() => {
    const params = new URLSearchParams()
    
    if (filters.search) params.set('search', filters.search)
    if (filters.genre) params.set('genre', filters.genre)
    if (filters.year) params.set('year', filters.year)
    
    params.set('sortBy', sorting.sortBy)
    params.set('sortOrder', sorting.sortOrder)
    params.set('page', pagination.page.toString())
    params.set('limit', pagination.limit.toString())
    
    return params
  }, [filters, sorting, pagination])

  // データを取得する関数
  const fetchAnimes = useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API.ENDPOINTS.ANIMES}?${searchParams}`, {
        signal: AbortSignal.timeout(API.TIMEOUT)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      setAnimes(data.animes || [])
      setPaginationInfo(data.pagination || {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0
      })
    } catch (err) {
      console.error('Failed to fetch animes:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAnimes([])
      setPaginationInfo({
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }, [enabled, searchParams, pagination.page, pagination.limit])

  // 初期化とパラメータ変更時にデータを取得
  useEffect(() => {
    fetchAnimes()
  }, [fetchAnimes])

  // ページネーション情報を計算
  const hasNextPage = paginationInfo.page < paginationInfo.totalPages
  const hasPrevPage = paginationInfo.page > 1

  return {
    animes,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchAnimes,
    hasNextPage,
    hasPrevPage
  }
} 