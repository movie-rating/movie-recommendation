'use client'

import { memo } from 'react'

interface MovieMetadata {
  isTV: boolean
  runtime: string | null
  year: string | null
  rating: string | null
  creator: string | null
  cast: string | null
  seasons: string | null
  overview: string | undefined
}

interface ExpandedDetailsProps {
  metadata: MovieMetadata
  reasoning: string
  matchExplanation?: string
  isUserMovie: boolean
}

export const ExpandedDetails = memo(function ExpandedDetails({
  metadata,
  reasoning,
  matchExplanation,
  isUserMovie
}: ExpandedDetailsProps) {
  const { isTV, runtime, rating, creator, cast, seasons, overview } = metadata

  return (
    <div className="text-sm space-y-2">
      {(runtime || rating) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {rating && <span>⭐ {rating}/10</span>}
          {runtime && <span>• {runtime}</span>}
        </div>
      )}

      {creator && (
        <p><span className="font-medium">{isTV ? 'Creator:' : 'Director:'}</span> {creator}</p>
      )}

      {isTV && seasons && (
        <p><span className="font-medium">Seasons:</span> {seasons}</p>
      )}

      {cast && (
        <p><span className="font-medium">Cast:</span> {cast}</p>
      )}

      {overview && (
        <p className="text-muted-foreground line-clamp-3">{overview}</p>
      )}

      {isUserMovie && reasoning && (
        <div className="border-t pt-3 mt-3 space-y-2">
          <p className="font-semibold text-sm">Your Thoughts:</p>
          <p className="text-sm text-foreground italic">&quot;{reasoning}&quot;</p>
        </div>
      )}

      {!isUserMovie && matchExplanation && (
        <div className="border-t pt-3 mt-3 space-y-2">
          <p className="font-semibold text-sm">Why We Recommend This:</p>
          <p className="text-sm text-foreground">{matchExplanation}</p>
          {reasoning && (
            <p className="text-xs text-muted-foreground italic">{reasoning}</p>
          )}
        </div>
      )}

      {!isUserMovie && !matchExplanation && reasoning && (
        <p className="text-primary italic">{reasoning}</p>
      )}
    </div>
  )
})
