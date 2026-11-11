import { useCallback, useEffect, useRef, useState } from 'react'

import {
  defaultMoneyPeriod,
  moneyApi,
  type MoneyOverview,
  type MoneyPeriod,
} from '../api/moneyApi'

import { getMoneyCache, saveMoneyCache } from '../db/moneyDatabase'

interface MoneyLoadResult {
  overview: MoneyOverview
  updatedAt: number
}

// Не допускаем повторных одинаковых запросов,
// например при повторном запуске эффекта в React StrictMode.
const inFlightRequests = new Map<string, Promise<MoneyLoadResult>>()

async function loadMoneyFromServer(
  userId: string,
  period: MoneyPeriod,
): Promise<MoneyLoadResult> {
  const requestKey = `${userId}|${period.from}|${period.to}`
  const existingRequest = inFlightRequests.get(requestKey)

  if (existingRequest) {
    return existingRequest
  }

  const request = (async (): Promise<MoneyLoadResult> => {
    try {
      const overview = await moneyApi.getOverview(period)
      const updatedAt = Date.now()

      try {
        await saveMoneyCache({ userId, overview, period, updatedAt })
      } catch (cacheError) {
        // Ошибка кеширования не отменяет успешную загрузку.
        console.warn('Не удалось сохранить кеш денежных средств:', cacheError)
      }

      return { overview, updatedAt }
    } finally {
      inFlightRequests.delete(requestKey)
    }
  })()

  inFlightRequests.set(requestKey, request)

  return request
}

interface UseMoneyResult {
  overview: MoneyOverview | null
  isLoading: boolean
  isRefreshing: boolean
  error: string
  cacheUpdatedAt: number | null
  period: MoneyPeriod
  setPeriod: (period: MoneyPeriod) => void
  loadedPeriod: MoneyPeriod | null
  refresh: () => Promise<void>
}

export function useMoney(userId: string): UseMoneyResult {
  const [overview, setOverview] = useState<MoneyOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null)

  // Период в полях ввода.
  const [period, setPeriod] = useState<MoneyPeriod>(defaultMoneyPeriod)
  // Период, за который загружены данные на экране.
  const [loadedPeriod, setLoadedPeriod] = useState<MoneyPeriod | null>(null)

  // Актуальный пользователь — чтобы refresh не записал чужой результат,
  // если userId сменился во время запроса.
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  // Первичная загрузка: сначала IndexedDB, затем сервер при отсутствии кеша.
  useEffect(() => {
    let cancelled = false

    const initialPeriod = defaultMoneyPeriod()

    setOverview(null)
    setError('')
    setCacheUpdatedAt(null)
    setPeriod(initialPeriod)
    setLoadedPeriod(null)
    setIsLoading(true)
    setIsRefreshing(false)

    async function initializeMoney() {
      if (!userId) {
        setError('Не удалось определить пользователя.')
        setIsLoading(false)
        return
      }

      try {
        const cached = await getMoneyCache(userId)

        if (cancelled) return

        if (cached) {
          setOverview(cached.overview)
          setCacheUpdatedAt(cached.updatedAt)
          setPeriod(cached.period)
          setLoadedPeriod(cached.period)
          setIsLoading(false)

          // Кеш есть — автоматически к серверу не обращаемся.
          return
        }
      } catch (cacheError) {
        console.warn('Не удалось прочитать кеш денежных средств:', cacheError)
      }

      // Кеша нет или его не удалось прочитать — загружаем с сервера.
      try {
        const result = await loadMoneyFromServer(userId, initialPeriod)

        if (cancelled) return

        setOverview(result.overview)
        setCacheUpdatedAt(result.updatedAt)
        setLoadedPeriod(initialPeriod)
      } catch (loadError) {
        if (import.meta.env.DEV) {
          console.error('Не удалось загрузить данные о деньгах:', loadError)
        }

        if (!cancelled) {
          setError(
            'Не удалось загрузить данные о денежных средствах. Проверьте подключение к серверу.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void initializeMoney()

    return () => {
      cancelled = true
    }
  }, [userId])

  // Принудительное обновление по кнопке (за выбранный период).
  const refresh = useCallback(async () => {
    if (!userId || isRefreshing || isLoading) return

    if (new Date(period.from) >= new Date(period.to)) {
      setError('Начало периода должно быть раньше конца.')
      return
    }

    setIsRefreshing(true)
    setError('')

    try {
      const result = await loadMoneyFromServer(userId, period)

      if (userIdRef.current !== userId) return

      setOverview(result.overview)
      setCacheUpdatedAt(result.updatedAt)
      setLoadedPeriod(period)
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Не удалось обновить данные о деньгах:', loadError)
      }

      if (userIdRef.current !== userId) return

      setError(
        overview
          ? 'Не удалось обновить данные. На экране показана последняя сохранённая версия.'
          : 'Не удалось загрузить данные о денежных средствах. Проверьте подключение к серверу.',
      )
    } finally {
      if (userIdRef.current === userId) {
        setIsRefreshing(false)
      }
    }
  }, [userId, isRefreshing, isLoading, overview, period])

  return {
    overview,
    isLoading,
    isRefreshing,
    error,
    cacheUpdatedAt,
    period,
    setPeriod,
    loadedPeriod,
    refresh,
  }
}
