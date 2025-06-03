import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

  // 前回のパラメータをキャッシュして無限ループを防ぐ
  const lastParamsRef = useRef<string>('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 検索語句をdebounce
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '')

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search || '')
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [filters.search])

  // URLパラメータを構築
  const searchParams = useMemo(() => {
    const params = new URLSearchParams()
    
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (filters.genre) params.set('genre', filters.genre)
    if (filters.year) params.set('year', filters.year)
    
    params.set('sortBy', sorting.sortBy)
    params.set('sortOrder', sorting.sortOrder)
    params.set('page', pagination.page.toString())
    params.set('limit', pagination.limit.toString())
    
    return params.toString()
  }, [debouncedSearch, filters.genre, filters.year, sorting.sortBy, sorting.sortOrder, pagination.page, pagination.limit])

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
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      })
    } catch (err) {
      console.error('Failed to fetch animes:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAnimes([])
      setPaginationInfo({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }, [enabled, searchParams])

  // 初期化とパラメータ変更時にデータを取得
  useEffect(() => {
    // パラメータが変更された場合のみフェッチ
    if (lastParamsRef.current !== searchParams) {
      lastParamsRef.current = searchParams
      fetchAnimes()
    }
  }, [fetchAnimes, searchParams])

  // 再フェッチ用の安定した関数
  const refetch = useCallback(async () => {
    // 強制的に再フェッチ
    lastParamsRef.current = ''
    await fetchAnimes()
  }, [fetchAnimes])

  // ページネーション情報を計算
  const hasNextPage = paginationInfo.page < paginationInfo.totalPages
  const hasPrevPage = paginationInfo.page > 1

  return {
    animes,
    loading,
    error,
    pagination: paginationInfo,
    refetch,
    hasNextPage,
    hasPrevPage
  }
} 