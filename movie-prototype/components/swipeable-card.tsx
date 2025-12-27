'use client'

import { ReactNode } from 'react'
import { useSwipe } from '@/lib/hooks/use-swipe'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftLabel?: string
  rightLabel?: string
  disabled?: boolean
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Pass',
  rightLabel = 'Add',
  disabled = false
}: SwipeableCardProps) {
  const { swipeState, handlers } = useSwipe({
    threshold: 80,
    onSwipeLeft: disabled ? undefined : onSwipeLeft,
    onSwipeRight: disabled ? undefined : onSwipeRight
  })

  const { x, direction, swiping } = swipeState
  const absX = Math.abs(x)
  const opacity = Math.min(absX / 80, 1)
  const isThresholdMet = absX > 80

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background indicators */}
      <div className="absolute inset-0 flex">
        {/* Left indicator (Pass) */}
        <div
          className={cn(
            'flex-1 flex items-center justify-start pl-6 bg-destructive/20 transition-opacity',
            direction === 'left' && swiping ? 'opacity-100' : 'opacity-0'
          )}
          style={{ opacity: direction === 'left' ? opacity : 0 }}
        >
          <div className={cn(
            'flex items-center gap-2 text-destructive font-medium transition-transform',
            isThresholdMet && direction === 'left' ? 'scale-110' : 'scale-100'
          )}>
            <X className="w-5 h-5" />
            <span>{leftLabel}</span>
          </div>
        </div>

        {/* Right indicator (Add) */}
        <div
          className={cn(
            'flex-1 flex items-center justify-end pr-6 bg-primary/20 transition-opacity',
            direction === 'right' && swiping ? 'opacity-100' : 'opacity-0'
          )}
          style={{ opacity: direction === 'right' ? opacity : 0 }}
        >
          <div className={cn(
            'flex items-center gap-2 text-primary font-medium transition-transform',
            isThresholdMet && direction === 'right' ? 'scale-110' : 'scale-100'
          )}>
            <span>{rightLabel}</span>
            <Plus className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        {...handlers}
        className={cn(
          'relative bg-card transition-transform',
          !swiping && 'transition-transform duration-300'
        )}
        style={{
          transform: `translateX(${x}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
