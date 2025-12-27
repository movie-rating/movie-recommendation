'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from './ui/button'
import { RatingModal } from './rating-modal'
import { NotInterestedModal } from './not-interested-modal'
import { SuccessToast } from './success-toast'
import { PlatformBadge } from './platform-badge'
import { BookmarkPlus, Star, XCircle } from 'lucide-react'
import { RATING_MAP } from '@/lib/constants'
import type { MovieFeedback, MediaType, TMDBMovieDetails, TMDBTVDetails } from '@/lib/types'
import { 
  getRuntime, 
  getReleaseYear, 
  getRating, 
  getCreatorOrDirector, 
  getCast, 
  getSeasonInfo 
} from '@/lib/movie-display-utils'
import { saveFeedbackAction, removeFeedbackAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'

interface MovieCardExpandableProps {
  id: string
  title: string
  posterUrl: string
  reasoning: string
  matchExplanation?: string
  feedback?: MovieFeedback | null
  experimental?: boolean
  movieDetails?: TMDBMovieDetails | TMDBTVDetails | null
  mediaType?: MediaType
  matchConfidence?: number
  isUserMovie?: boolean // Flag for user-added movies (not recommendations)
  availableOn?: string | null
}

export function MovieCardExpandable({ 
  id,
  title, 
  posterUrl, 
  reasoning,
  matchExplanation,
  feedback,
  experimental = false,
  movieDetails,
  mediaType = 'movie',
  matchConfidence,
  isUserMovie = false,
  availableOn
}: MovieCardExpandableProps) {
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()

  const handleAddToWatchlist = async () => {
    const result = await saveFeedbackAction(id, 'watchlist')
    if (result.success) {
      setSuccessMessage('Added to watchlist')
      setShowSuccessToast(true)
      router.refresh()
    }
  }

  const handleRemoveFromWatchlist = async () => {
    const result = await removeFeedbackAction(id)
    if (result.success) {
      setSuccessMessage('Removed from watchlist')
      setShowSuccessToast(true)
      router.refresh()
    }
  }

  const getRatingDisplay = () => {
    if (!feedback?.rating) return null
    return RATING_MAP[feedback.rating as keyof typeof RATING_MAP] || feedback.rating
  }

  const isTV = mediaType === 'tv'
  const runtime = getRuntime(movieDetails || null, isTV)
  const year = getReleaseYear(movieDetails || null, isTV)
  const rating = getRating(movieDetails || null)
  const creator = getCreatorOrDirector(movieDetails || null, isTV)
  const cast = getCast(movieDetails || null)
  const seasons = getSeasonInfo(movieDetails || null, isTV)

  return (
    <>
      <div className="group fade-in">
        {experimental && (
          <div className="mb-2">
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
              🎲 Stretch Pick
            </span>
          </div>
        )}
        <div 
          className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-3 shadow-md cursor-pointer hover-lift hover-glow smooth-transition"
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
            <div className="flex-1">
              <h3 className="font-semibold text-base line-clamp-2">{title}</h3>
              
              {/* Match percentage badge */}
              {matchConfidence && (
                <div className="flex items-center gap-1 mt-1">
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    matchConfidence >= 85 ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                    matchConfidence >= 70 ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                    'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                  }`}>
                    {matchConfidence}% Match
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isTV ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                {isTV ? 'TV' : 'Movie'}
              </span>
              {year && <span className="text-xs text-muted-foreground">{year}</span>}
              <PlatformBadge availableOn={availableOn} size="sm" />
            </div>
          </div>

          {!expanded ? (
            <>
              <p className="text-sm text-muted-foreground line-clamp-2">{reasoning}</p>
              
              {(runtime || rating) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {rating && <span>⭐ {rating}</span>}
                  {runtime && <span>• {runtime}</span>}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm space-y-2 pb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground italic">
                      {reasoning}
                    </p>
                  )}
                </div>
              )}
              
              {!isUserMovie && !matchExplanation && reasoning && (
                <p className="text-primary italic">{reasoning}</p>
              )}
            </div>
          )}
          
          {feedback?.rating && (
            <div className="text-sm font-medium text-primary">
              {getRatingDisplay()}
            </div>
          )}

          {feedback?.status === 'watchlist' && !isUserMovie && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-primary">
                ✓ In Your Watchlist
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveFromWatchlist}
                className="w-full text-xs h-8"
              >
                Remove from Watchlist
              </Button>
            </div>
          )}

          {feedback?.status === 'not_interested' && !feedback?.rating && !isUserMovie && (
            <div className="text-sm font-medium text-muted-foreground">
              🚫 Not Interested
            </div>
          )}

          {feedback?.reason && (
            <p className="text-sm text-muted-foreground italic line-clamp-2">
              &quot;{feedback.reason}&quot;
            </p>
          )}
          
          {!feedback && !isUserMovie && (
            <div className="space-y-2">
              {/* Primary Action - Watchlist */}
              <Button
                size="lg"
                onClick={handleAddToWatchlist}
                className="w-full min-h-[52px] bg-green-600 hover:bg-green-700 text-white shadow-sm active:scale-[0.98] transition-transform"
                aria-label="Add to watchlist"
              >
                <BookmarkPlus className="h-5 w-5 mr-2" />
                <span className="font-semibold">Add to Watchlist</span>
              </Button>
              
              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRatingModal(true)}
                  className="h-11 border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-600 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900 dark:hover:border-blue-500 font-semibold shadow-sm active:scale-[0.98] transition-all"
                  aria-label="Mark as watched and rate"
                >
                  <Star className="h-4 w-4 mr-1.5" />
                  <span className="font-semibold">Watched</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNotInterestedModal(true)}
                  className="h-11 border-2 border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:border-slate-500 font-semibold shadow-sm active:scale-[0.98] transition-all"
                  aria-label="Mark as not interested"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  <span className="font-semibold">Pass</span>
                </Button>
              </div>
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

      <SuccessToast 
        message={successMessage}
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </>
  )
}

