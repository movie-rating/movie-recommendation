import { useState, useCallback, useRef, TouchEvent } from 'react'

interface SwipeState {
  x: number
  direction: 'left' | 'right' | null
  swiping: boolean
}

interface UseSwipeOptions {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useSwipe({ threshold = 100, onSwipeLeft, onSwipeRight }: UseSwipeOptions = {}) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    x: 0,
    direction: null,
    swiping: false
  })

  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontalSwipe.current = null
    setSwipeState({ x: 0, direction: null, swiping: true })
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startX.current) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = currentX - startX.current
    const diffY = currentY - startY.current

    // Determine if this is a horizontal or vertical swipe on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY)
    }

    // Only track horizontal swipes
    if (isHorizontalSwipe.current) {
      e.preventDefault() // Prevent vertical scroll
      const direction = diffX > 0 ? 'right' : 'left'
      setSwipeState({ x: diffX, direction, swiping: true })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const { x, direction } = swipeState

    if (Math.abs(x) > threshold) {
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft()
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight()
      }
    }

    // Reset
    startX.current = 0
    startY.current = 0
    isHorizontalSwipe.current = null
    setSwipeState({ x: 0, direction: null, swiping: false })
  }, [swipeState, threshold, onSwipeLeft, onSwipeRight])

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    }
  }
}
