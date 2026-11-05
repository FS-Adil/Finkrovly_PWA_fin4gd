import { useCallback, useEffect, useState } from 'react'

import { stockApi, type StockOverview } from '../api/stockApi'

import {
  getStockCache,
  saveStockCache,
} from '../db/stockDatabase'

interface StockLoadResult {
  overview: StockOverview
  updatedAt: number
}

// Не допускаем повторных одинаковых запросов,
// например при повторном запуске эффекта в React StrictMode.
const inFlightRequests = new Map<string, Promise<StockLoadResult>>()

async function loadStockFromServer(
  userId: string,
): Promise<StockLoadResult> {
  const existingRequest = inFlightRequests.get(userId)

  if (existingRequest) {
    return existingRequest
  }

  const request = (async (): Promise<StockLoadResult> => {
    try {
      const overview = await stockApi.getOverview()
      const updatedAt = Date.now()

      try {
        await saveStockCache({
          userId,
          overview,
          updatedAt,
        })
      } catch (cacheError) {
        // Ошибка кеширования не должна отменять
        // успешную загрузку данных с сервера.
        console.warn('Не удалось сохранить складской кеш:', cacheError)
      }

      return {
        overview,
        updatedAt,
      }
    } finally {
      inFlightRequests.delete(userId)
    }
  })()

  inFlightRequests.set(userId, request)

  return request
}

interface UseStockResult {
  overview: StockOverview | null
  isLoading: boolean
  isRefreshing: boolean
  error: string
  cacheUpdatedAt: number | null
  refresh: () => Promise<void>
}

export function useStock(userId: string): UseStockResult {
  const [overview, setOverview] = useState<StockOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null)

  // Первичная загрузка: сначала IndexedDB, затем сервер при отсутствии кеша.
  useEffect(() => {
    let cancelled = false

    setOverview(null)
    setError('')
    setCacheUpdatedAt(null)
    setIsLoading(true)
    setIsRefreshing(false)

    async function initializeStock() {
      if (!userId) {
        setError('Не удалось определить пользователя.')
        setIsLoading(false)
        return
      }

      try {
        const cached = await getStockCache(userId)

        if (cancelled) return

        if (cached) {
          setOverview(cached.overview)
          setCacheUpdatedAt(cached.updatedAt)
          setIsLoading(false)

          // Кеш есть — автоматически к серверу не обращаемся.
          return
        }
      } catch (cacheError) {
        console.warn('Не удалось прочитать складской кеш:', cacheError)
      }

      // Кеша нет или его не удалось прочитать — загружаем с сервера.
      try {
        const result = await loadStockFromServer(userId)

        if (cancelled) return

        setOverview(result.overview)
        setCacheUpdatedAt(result.updatedAt)
      } catch (loadError) {
        if (import.meta.env.DEV) {
          console.error('Не удалось загрузить складские данные:', loadError)
        }

        if (!cancelled) {
          setError(
            'Не удалось загрузить складские данные. Проверьте подключение к серверу.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void initializeStock()

    return () => {
      cancelled = true
    }
  }, [userId])

  // Принудительное обновление по кнопке.
  const refresh = useCallback(async () => {
    if (!userId || isRefreshing || isLoading) return

    setIsRefreshing(true)
    setError('')

    try {
      const result = await loadStockFromServer(userId)

      setOverview(result.overview)
      setCacheUpdatedAt(result.updatedAt)
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Не удалось обновить складские данные:', loadError)
      }

      setError(
        overview
          ? 'Не удалось обновить данные. На экране показана последняя сохранённая версия.'
          : 'Не удалось загрузить складские данные. Проверьте подключение к серверу.',
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [userId, isRefreshing, isLoading, overview])

  return {
    overview,
    isLoading,
    isRefreshing,
    error,
    cacheUpdatedAt,
    refresh,
  }
}