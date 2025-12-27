'use client'

import Image from 'next/image'
import { PlatformBadge } from '@/components/platform-badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMovieCard, type MovieCardData } from '@/lib/hooks/use-movie-card'
import { ActionButtons } from './action-buttons'
import { ExpandedDetails } from './expanded-details'
import { MovieModals } from './movie-modals'
import { useCallback } from 'react'

type MovieCardVariant = 'grid' | 'horizontal'

interface MovieCardProps extends MovieCardData {
  variant?: MovieCardVariant
}

export function MovieCard(props: MovieCardProps) {
  const { variant = 'grid', ...data } = props
  const {
    title,
    posterUrl,
    reasoning,
    matchExplanation,
    feedback,
    experimental = false,
    matchConfidence,
    isUserMovie = false,
    availableOn
  } = data

  const {
    modals,
    openModal,
    closeModal,
    expanded,
    setExpanded,
    toast,
    clearToast,
    isLoading,
    handleAddToWatchlist,
    handleRemoveFromWatchlist,
    getRatingDisplay,
    metadata
  } = useMovieCard(data)

  const { isTV, runtime, year, rating } = metadata

  // Memoized callbacks for modal operations
  const handleOpenRating = useCallback(() => openModal('rating'), [openModal])
  const handleOpenNotInterested = useCallback(() => openModal('notInterested'), [openModal])
  const handleCloseRating = useCallback(() => closeModal('rating'), [closeModal])
  const handleCloseNotInterested = useCallback(() => closeModal('notInterested'), [closeModal])
  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), [setExpanded])

  // ========== GRID LAYOUT ==========
  if (variant === 'grid') {
    return (
      <>
        <div className="group fade-in">
          {experimental && (
            <div className="mb-2">
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                Something Different
              </span>
            </div>
          )}

          <div
            className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-3 cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
            onClick={toggleExpanded}
          >
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
            {/* Subtle gradient overlay for text legibility */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
            {/* Match badge on poster */}
            {matchConfidence && (
              <div className="absolute top-2 left-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-foreground backdrop-blur-sm">
                  {matchConfidence}%
                </span>
              </div>
            )}
            {/* Platform badge */}
            <div className="absolute top-2 right-2">
              <PlatformBadge availableOn={availableOn} size="sm" />
            </div>
          </div>

          <div className="space-y-2">
            {/* Title and year only - clean minimal info */}
            <div>
              <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {year && <span>{year}</span>}
                {isTV && <span>· TV Series</span>}
                {rating && <span>· {rating}</span>}
              </div>
            </div>

            {/* Expanded details */}
            {expanded && (
              <div className="pt-2 border-t border-border">
                <ExpandedDetails
                  metadata={metadata}
                  reasoning={reasoning}
                  matchExplanation={matchExplanation}
                  isUserMovie={isUserMovie}
                />
              </div>
            )}

            {feedback?.rating && (
              <div className="text-sm font-medium text-primary">{getRatingDisplay()}</div>
            )}

            {feedback?.reason && (
              <p className="text-sm text-muted-foreground italic line-clamp-2">
                &quot;{feedback.reason}&quot;
              </p>
            )}

            <ActionButtons
              feedback={feedback}
              isUserMovie={isUserMovie}
              isLoading={isLoading}
              variant={variant}
              onAddToWatchlist={handleAddToWatchlist}
              onRemoveFromWatchlist={handleRemoveFromWatchlist}
              onOpenRatingModal={handleOpenRating}
              onOpenNotInterestedModal={handleOpenNotInterested}
            />

            {/* Expand toggle */}
            <button
              onClick={toggleExpanded}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              {expanded ? 'Show less' : 'More info'}
            </button>
          </div>
        </div>
        <MovieModals
          title={title}
          recommendationId={data.id}
          modals={modals}
          toast={toast}
          onCloseRating={handleCloseRating}
          onCloseNotInterested={handleCloseNotInterested}
          onClearToast={clearToast}
        />
      </>
    )
  }

  // ========== HORIZONTAL LAYOUT ==========
  return (
    <>
      <div className="group fade-in bg-card border border-border rounded-xl overflow-hidden">
        {experimental && (
          <div className="px-4 pt-3">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
              Something Different
            </span>
          </div>
        )}

        <div className="flex gap-4 p-4">
          {/* Poster */}
          <div className="flex-shrink-0 w-[100px]">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="100px"
              />
              {/* Match badge on poster */}
              {matchConfidence && (
                <div className="absolute top-1.5 left-1.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/90 text-foreground">
                    {matchConfidence}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header: Title + meta */}
            <div className="mb-3">
              <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1">{title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {year && <span>{year}</span>}
                {isTV && <span>· TV</span>}
                {rating && <span>· {rating}</span>}
                {runtime && <span>· {runtime}</span>}
                <PlatformBadge availableOn={availableOn} size="sm" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mb-3">
              <ActionButtons
                feedback={feedback}
                isUserMovie={isUserMovie}
                isLoading={isLoading}
                variant={variant}
                onAddToWatchlist={handleAddToWatchlist}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
                onOpenRatingModal={handleOpenRating}
                onOpenNotInterestedModal={handleOpenNotInterested}
              />
            </div>

            {/* Expanded details */}
            {expanded && (
              <div className="border-t border-border pt-3 mb-3">
                <ExpandedDetails
                  metadata={metadata}
                  reasoning={reasoning}
                  matchExplanation={matchExplanation}
                  isUserMovie={isUserMovie}
                />
              </div>
            )}

            {feedback?.rating && (
              <div className="text-sm font-medium text-primary mb-2">{getRatingDisplay()}</div>
            )}

            {feedback?.reason && (
              <p className="text-sm text-muted-foreground italic mb-2">
                &quot;{feedback.reason}&quot;
              </p>
            )}

            {/* Expand toggle */}
            <button
              onClick={toggleExpanded}
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full py-2 transition-colors mt-auto"
            >
              {expanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>More info</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <MovieModals
        title={title}
        recommendationId={data.id}
        modals={modals}
        toast={toast}
        onCloseRating={handleCloseRating}
        onCloseNotInterested={handleCloseNotInterested}
        onClearToast={clearToast}
      />
    </>
  )
}

// Re-export for backward compatibility
export { MovieCard as MovieCardExpandable }
export { MovieCard as MovieCardHorizontal }
