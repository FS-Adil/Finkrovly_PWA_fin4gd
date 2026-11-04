import { useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 90
const MAX_PULL_DISTANCE = 110

export function usePullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const startY = useRef(0)
  const currentDistance = useRef(0)
  const pulling = useRef(false)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const getScrollTop = () =>
      document.scrollingElement?.scrollTop ??
      document.documentElement.scrollTop ??
      window.scrollY

    const handleTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || getScrollTop() > 0) {
        pulling.current = false
        return
      }

      startY.current = event.touches[0].clientY
      currentDistance.current = 0
      pulling.current = true
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return

      const distance = event.touches[0].clientY - startY.current

      if (distance <= 0 || getScrollTop() > 0) {
        pulling.current = false
        currentDistance.current = 0
        setPullDistance(0)
        return
      }

      currentDistance.current = distance
      setPullDistance(Math.min(distance * 0.5, MAX_PULL_DISTANCE))

      // Перехватываем жест, чтобы браузер не запустил
      // собственное обновление страницы.
      if (event.cancelable) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!pulling.current) return

      pulling.current = false

      if (currentDistance.current >= PULL_THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)

        // Даём браузеру возможность показать индикатор,
        // затем полностью перезагружаем PWA.
        window.setTimeout(() => {
          window.location.reload()
        }, 100)

        return
      }

      currentDistance.current = 0
      setPullDistance(0)
    }

    const handleTouchCancel = () => {
      pulling.current = false
      currentDistance.current = 0

      if (!refreshingRef.current) {
        setPullDistance(0)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })

    window.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    })

    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [])

  return { pullDistance, refreshing }
}