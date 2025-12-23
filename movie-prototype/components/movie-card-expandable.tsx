'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from './ui/button'
import { RatingModal } from './rating-modal'
import { NotInterestedModal } from './not-interested-modal'
import { RATING_MAP } from '@/lib/constants'

export function MovieCardExpandable({ 
  id,
  title, 
  posterUrl, 
  reasoning,
  feedback,
  experimental = false,
  movieDetails,
  mediaType = 'movie'
}: { 
  id: string
  title: string
  posterUrl: string
  reasoning: string
  feedback?: { status: string; rating?: string; reason?: string } | null
  experimental?: boolean
  movieDetails?: any
  mediaType?: string
}) {
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const getRatingDisplay = () => {
    if (!feedback?.rating) return null
    return RATING_MAP[feedback.rating as keyof typeof RATING_MAP] || feedback.rating
  }

  const isTV = mediaType === 'tv'
  
  const runtime = isTV 
    ? (movieDetails?.episode_run_time?.[0] ? `${movieDetails.episode_run_time[0]}min/ep` : null)
    : (movieDetails?.runtime ? `${Math.floor(movieDetails.runtime / 60)}h ${movieDetails.runtime % 60}m` : null)

  const year = isTV 
    ? movieDetails?.first_air_date?.split('-')[0]
    : movieDetails?.release_date?.split('-')[0]
    
  const rating = movieDetails?.vote_average?.toFixed(1)
  
  const creator = isTV 
    ? movieDetails?.created_by?.[0]?.name
    : movieDetails?.credits?.crew?.find((c: any) => c.job === 'Director')?.name
    
  const cast = movieDetails?.credits?.cast?.slice(0, 3).map((c: any) => c.name).join(', ')
  
  const seasons = isTV && movieDetails?.number_of_seasons 
    ? `${movieDetails.number_of_seasons} season${movieDetails.number_of_seasons > 1 ? 's' : ''}`
    : null

  return (
    <>
      <div className="group">
        {experimental && (
          <div className="mb-2">
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
              🎲 Stretch Pick
            </span>
          </div>
        )}
        <div 
          className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-3 shadow-md cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <Image
            src={posterUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
          {!expanded && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-white text-sm font-medium">View Details</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{title}</h3>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isTV ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                {isTV ? 'TV' : 'Movie'}
              </span>
              {year && <span className="text-xs text-muted-foreground">{year}</span>}
            </div>
          </div>

          {!expanded ? (
            <>
              <p className="text-xs text-muted-foreground line-clamp-2">{reasoning}</p>
              
              {(runtime || rating) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {rating && <span>⭐ {rating}</span>}
                  {runtime && <span>• {runtime}</span>}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs space-y-2 pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                {rating && <span>⭐ {rating}/10</span>}
                {runtime && <span>• {runtime}</span>}
              </div>
              
              {creator && (
                <p><span className="font-medium">{isTV ? 'Creator:' : 'Director:'}</span> {creator}</p>
              )}
              
              {isTV && seasons && (
                <p><span className="font-medium">Seasons:</span> {seasons}</p>
              )}
              
              {cast && (
                <p><span className="font-medium">Cast:</span> {cast}</p>
              )}
              
              {movieDetails?.overview && (
                <p className="text-muted-foreground line-clamp-3">{movieDetails.overview}</p>
              )}
              
              <p className="text-primary italic">{reasoning}</p>
            </div>
          )}
          
          {feedback?.rating && (
            <div className="text-xs font-medium text-primary">
              {getRatingDisplay()}
            </div>
          )}

          {feedback?.status === 'not_interested' && !feedback?.rating && (
            <div className="text-xs font-medium text-muted-foreground">
              🚫 Not Interested
            </div>
          )}

          {feedback?.reason && (
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              &quot;{feedback.reason}&quot;
            </p>
          )}
          
          {!feedback && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowRatingModal(true)}
                className="flex-1 text-xs h-8"
              >
                Watched
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowNotInterestedModal(true)}
                className="flex-1 text-xs h-8"
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      </div>

      {showRatingModal && (
        <RatingModal
          movieTitle={title}
          recommendationId={id}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {showNotInterestedModal && (
        <NotInterestedModal
          movieTitle={title}
          recommendationId={id}
          onClose={() => setShowNotInterestedModal(false)}
        />
      )}
    </>
  )
}

