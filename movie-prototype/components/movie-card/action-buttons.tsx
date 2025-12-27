'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Check, X } from 'lucide-react'
import type { MovieFeedback } from '@/lib/types'

interface ActionButtonsProps {
  feedback?: MovieFeedback | null
  isUserMovie: boolean
  isLoading: boolean
  variant: 'grid' | 'horizontal'
  onAddToWatchlist: () => void
  onRemoveFromWatchlist: () => void
  onOpenRatingModal: () => void
  onOpenNotInterestedModal: () => void
}

export const ActionButtons = memo(function ActionButtons({
  feedback,
  isUserMovie,
  isLoading,
  variant,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onOpenRatingModal,
  onOpenNotInterestedModal
}: ActionButtonsProps) {
  // Already marked not interested
  if (feedback?.status === 'not_interested' && !feedback?.rating && !isUserMovie) {
    return (
      <div className="text-sm text-muted-foreground">
        Not interested
      </div>
    )
  }

  // In watchlist
  if (feedback?.status === 'watchlist' && !isUserMovie) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Check className="h-4 w-4" />
          In Watchlist
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemoveFromWatchlist}
          disabled={isLoading}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Remove
        </Button>
      </div>
    )
  }

  // No feedback yet - show action buttons
  if (!feedback && !isUserMovie) {
    return (
      <div className="space-y-2">
        {/* Primary action */}
        <Button
          size={variant === 'grid' ? 'default' : 'sm'}
          onClick={onAddToWatchlist}
          disabled={isLoading}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add to Watchlist
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenRatingModal}
            disabled={isLoading}
          >
            <Check className="h-4 w-4 mr-1" />
            Watched
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenNotInterestedModal}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Pass
          </Button>
        </div>
      </div>
    )
  }

  return null
})
