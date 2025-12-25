'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from './ui/button'
import { RatingModal } from './rating-modal'
import { NotInterestedModal } from './not-interested-modal'
import { SuccessToast } from './success-toast'
import { BookmarkPlus, Star, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
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

interface MovieCardHorizontalProps {
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
  isUserMovie?: boolean
}

export function MovieCardHorizontal({ 
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
  isUserMovie = false
}: MovieCardHorizontalProps) {
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()

  const handleAddToWatchlist = async () => {
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'movie-card-horizontal.tsx:handleAddToWatchlist',message:'Watchlist clicked',data:{movieId:id,title:title},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
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
      <div className="group fade-in bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {experimental && (
          <div className="px-3 pt-2">
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
              🎲 Stretch Pick
            </span>
          </div>
        )}
        
        <div className="flex gap-3 p-3">
          {/* Poster - Fixed width on left */}
          <div className="flex-shrink-0 w-[100px] sm:w-[120px]">
            <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-muted shadow-sm">
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>
          </div>

          {/* Content - Flexible width on right */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Title + Meta */}
            <div className="mb-3">
              <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1.5">
                {title}
              </h3>
              
              {/* Badges row - compact */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {matchConfidence && (
                  <span className={`font-semibold px-1.5 py-0.5 rounded ${
                    matchConfidence >= 85 ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                    matchConfidence >= 70 ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                    'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                  }`}>
                    {matchConfidence}%
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded ${
                  isTV ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}>
                  {isTV ? 'TV' : 'Movie'}
                </span>
                {year && <span className="text-muted-foreground">{year}</span>}
                {rating && <span className="text-muted-foreground">⭐ {rating}</span>}
              </div>
            </div>

            {/* CORE ACTION BUTTONS - Always visible, clearly labeled */}
            {!feedback && !isUserMovie && (
              <div className="space-y-2 mb-3">
                {/* Primary: Add to Watchlist */}
                <Button
                  size="sm"
                  onClick={handleAddToWatchlist}
                  className="w-full h-10 bg-green-600 hover:bg-green-700 text-white shadow-sm active:scale-[0.98] transition-transform"
                >
                  <BookmarkPlus className="h-4 w-4 mr-1.5" />
                  <span className="font-semibold">Add to Watchlist</span>
                </Button>
                
                {/* Secondary row: Already Watched + Pass */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRatingModal(true)}
                    className="h-10 border-blue-600/40 text-blue-600 hover:bg-blue-600/10 dark:text-blue-400 dark:border-blue-500/40"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    <span className="font-medium">Watched</span>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNotInterestedModal(true)}
                    className="h-10 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    <span className="font-medium">Pass</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Expanded details - Hidden by default, shown on "Show More" */}
            {expanded && (
              <div className="text-sm space-y-2 mb-2 border-t pt-3">
                {/* Why we recommend - Show first */}
                {!isUserMovie && matchExplanation && (
                  <div className="space-y-1 mb-3">
                    <p className="font-semibold text-sm">Why We Recommend This:</p>
                    <p className="text-foreground">{matchExplanation}</p>
                  </div>
                )}
                
                {/* AI reasoning */}
                {!isUserMovie && reasoning && (
                  <div className="mb-3">
                    <p className="text-muted-foreground italic">{reasoning}</p>
                  </div>
                )}
                
                {/* User thoughts for user-added movies */}
                {isUserMovie && reasoning && (
                  <div className="space-y-1 mb-3">
                    <p className="font-semibold text-sm">Your Thoughts:</p>
                    <p className="text-foreground italic">&quot;{reasoning}&quot;</p>
                  </div>
                )}
                
                {/* Movie details */}
                <div className="space-y-1.5">
                  {(runtime || rating) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {rating && <span>⭐ {rating}/10</span>}
                      {runtime && <span>• {runtime}</span>}
                    </div>
                  )}
                  
                  {creator && (
                    <p className="text-xs"><span className="font-medium">{isTV ? 'Creator:' : 'Director:'}</span> {creator}</p>
                  )}
                  
                  {isTV && seasons && (
                    <p className="text-xs"><span className="font-medium">Seasons:</span> {seasons}</p>
                  )}
                  
                  {cast && (
                    <p className="text-xs"><span className="font-medium">Cast:</span> {cast}</p>
                  )}
                  
                  {movieDetails?.overview && (
                    <p className="text-muted-foreground mt-2">{movieDetails.overview}</p>
                  )}
                </div>
              </div>
            )}

            {/* Feedback display */}
            {feedback?.rating && (
              <div className="text-sm font-medium text-primary mb-2">
                {getRatingDisplay()}
              </div>
            )}

            {feedback?.status === 'watchlist' && !isUserMovie && (
              <div className="mb-2">
                <div className="text-sm font-medium text-primary mb-1">
                  ✓ In Your Watchlist
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveFromWatchlist}
                  className="w-full"
                >
                  Remove from Watchlist
                </Button>
              </div>
            )}

            {feedback?.status === 'not_interested' && !feedback?.rating && !isUserMovie && (
              <div className="text-sm font-medium text-muted-foreground mb-2">
                🚫 Not Interested
              </div>
            )}

            {feedback?.reason && (
              <p className="text-sm text-muted-foreground italic mb-2">
                &quot;{feedback.reason}&quot;
              </p>
            )}

            {/* Show More toggle - Always at bottom */}
            <div className="mt-auto">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 w-full min-h-[44px] transition-colors font-medium"
              >
                {expanded ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Show More Details</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
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

