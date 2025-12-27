'use client'
import { useState, useEffect } from 'react'
import { MovieCardExpandable } from './movie-card-expandable'
import { MovieCardHorizontal } from './movie-card-horizontal'
import { Button } from './ui/button'
import { generateMoreRecommendationsAction, recalculateEarlierMatchesAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'
import { THRESHOLDS } from '@/lib/constants'
import type { RecommendationWithFeedback } from '@/lib/types'
import { RegenerateModal } from './regenerate-modal'
import { AddWatchedMovieForm } from './add-watched-movie-form'
import { useMediaQuery } from '@/lib/hooks/use-media-query'

type TabId = 'latest' | 'earlier' | 'watchlist' | 'watched' | 'not_interested'

export function RecommendationsTabs({
  recommendations,
  ratedCount,
  userPlatforms = []
}: {
  recommendations: RecommendationWithFeedback[]
  ratedCount: number
  userPlatforms?: string[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>('latest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [recalculateLoading, setRecalculateLoading] = useState(false)
  const [recalculateSuccess, setRecalculateSuccess] = useState<string | null>(null)
  const [showLoadMoreModal, setShowLoadMoreModal] = useState(false)
  const [showAddMovieForm, setShowAddMovieForm] = useState(false)
  const router = useRouter()

  // Check for onboarding warnings from sessionStorage
  useEffect(() => {
    const storedWarning = sessionStorage.getItem('onboarding_warning')
    if (storedWarning) {
      setWarning(storedWarning)
      sessionStorage.removeItem('onboarding_warning')
    }
  }, [])
  
  // Use media query to conditionally render components (not just hide with CSS)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const toWatch = recommendations
    .filter(r => !r.feedback)
    .sort((a, b) => (b.match_confidence || 0) - (a.match_confidence || 0))
  const watchlist = recommendations.filter(r => r.feedback?.status === 'watchlist')
  const watched = recommendations.filter(r => r.feedback?.status === 'watched')
  const notInterested = recommendations.filter(r => r.feedback?.status === 'not_interested')
  
  // Find the latest batch_id to split recommendations into Latest and Earlier
  const maxBatchId = toWatch.length > 0 
    ? Math.max(...toWatch.map(r => r.batch_id || 1))
    : 1
  
  // Split by batch_id
  const latestRecs = toWatch.filter(r => (r.batch_id || 1) === maxBatchId)
  const earlierRecs = toWatch.filter(r => (r.batch_id || 1) < maxBatchId)
  
  const experimental = latestRecs.filter(r => r.is_experimental)
  const regular = latestRecs.filter(r => !r.is_experimental)

  const handleLoadMore = async (guidance: string) => {
    setLoading(true)
    setError(null)
    const result = await generateMoreRecommendationsAction(guidance)
    setLoading(false)
    
    if (result.success) {
      setShowLoadMoreModal(false)
      router.refresh()
    } else {
      setError(result.error || 'Failed to generate recommendations')
    }
  }

  const handleRecalculateMatches = async () => {
    setRecalculateLoading(true)
    setError(null)
    setRecalculateSuccess(null)
    
    const result = await recalculateEarlierMatchesAction()
    
    setRecalculateLoading(false)
    
    if (result.success) {
      setRecalculateSuccess(result.message || 'Match scores updated!')
      router.refresh()
      // Clear success message after 5 seconds
      setTimeout(() => setRecalculateSuccess(null), 5000)
    } else {
      setError(result.error || 'Failed to recalculate matches')
    }
  }

  const tabs = [
    { id: 'latest' as TabId, label: 'Latest', count: latestRecs.length },
    { id: 'earlier' as TabId, label: 'Earlier', count: earlierRecs.length },
    { id: 'watchlist' as TabId, label: 'My Watchlist', count: watchlist.length },
    { id: 'watched' as TabId, label: 'Already Watched', count: watched.length },
    { id: 'not_interested' as TabId, label: 'Not Interested', count: notInterested.length },
  ]

  const currentMovies = activeTab === 'latest' ? latestRecs 
    : activeTab === 'earlier' ? earlierRecs
    : activeTab === 'watchlist' ? watchlist
    : activeTab === 'watched' ? watched 
    : notInterested

  const hasAnyFeedback = watched.length > 0 || notInterested.length > 0

  return (
    <div>
      {/* Tab Navigation with improved mobile UX */}
      <div className="relative -mx-4 px-4 mb-8">
        {/* Scroll gradient indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                snap-start flex-shrink-0 px-4 py-3 min-h-[48px] 
                font-medium border-b-2 transition-all whitespace-nowrap
                active:scale-95 touch-manipulation
                ${activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="block text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Warning banner for platform save failures */}
      {warning && (
        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-md border border-amber-500/20 mb-6 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="font-medium">Platform preferences not saved</p>
            <p className="text-sm opacity-90">{warning}</p>
          </div>
          <button
            onClick={() => setWarning(null)}
            className="text-amber-700 dark:text-amber-400 hover:opacity-70 flex-shrink-0 p-1"
            aria-label="Dismiss warning"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {activeTab === 'latest' ? (
        <>
          {regular.length === 0 && experimental.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No new recommendations</p>
              {recommendations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm">You've reviewed all your latest recommendations!</p>
                  {ratedCount >= THRESHOLDS.MIN_RATINGS_FOR_MORE && (
                    <Button
                      variant="outline"
                      onClick={() => setShowLoadMoreModal(true)}
                      className="mt-4"
                    >
                      🔄 Generate More Recommendations
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm">Rate some movies in the &quot;Already Watched&quot; tab to get personalized recommendations.</p>
              )}
            </div>
          ) : (
            <>
              {/* Main recommendations */}
              {regular.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-4">Recommended For You</h2>
                  
                  {isMobile ? (
                    <div className="space-y-4">
                      {regular.map(rec => (
                        <MovieCardHorizontal
                          key={rec.id}
                          id={rec.id}
                          title={rec.movie_title}
                          posterUrl={rec.posterUrl}
                          reasoning={rec.reasoning}
                          matchExplanation={rec.match_explanation}
                          feedback={rec.feedback}
                          movieDetails={rec.movieDetails}
                          mediaType={rec.media_type}
                          matchConfidence={rec.match_confidence}
                          isUserMovie={rec.isUserMovie}
                          availableOn={rec.available_on}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                      {regular.map(rec => (
                        <MovieCardExpandable
                          key={rec.id}
                          id={rec.id}
                          title={rec.movie_title}
                          posterUrl={rec.posterUrl}
                          reasoning={rec.reasoning}
                          matchExplanation={rec.match_explanation}
                          feedback={rec.feedback}
                          movieDetails={rec.movieDetails}
                          mediaType={rec.media_type}
                          matchConfidence={rec.match_confidence}
                          isUserMovie={rec.isUserMovie}
                          availableOn={rec.available_on}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Experimental section */}
              {experimental.length > 0 && (
                <div className="mb-12 p-4 sm:p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🎲</span>
                    <h2 className="text-2xl font-bold">Try Something Different</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Based on your taste profile, these might surprise you in a good way
                  </p>
                  
                  {isMobile ? (
                    <div className="space-y-4">
                      {experimental.map(rec => (
                        <MovieCardHorizontal
                          key={rec.id}
                          id={rec.id}
                          title={rec.movie_title}
                          posterUrl={rec.posterUrl}
                          reasoning={rec.reasoning}
                          matchExplanation={rec.match_explanation}
                          feedback={rec.feedback}
                          experimental={true}
                          movieDetails={rec.movieDetails}
                          mediaType={rec.media_type}
                          matchConfidence={rec.match_confidence}
                          isUserMovie={rec.isUserMovie}
                          availableOn={rec.available_on}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                      {experimental.map(rec => (
                        <MovieCardExpandable
                          key={rec.id}
                          id={rec.id}
                          title={rec.movie_title}
                          posterUrl={rec.posterUrl}
                          reasoning={rec.reasoning}
                          matchExplanation={rec.match_explanation}
                          feedback={rec.feedback}
                          experimental={true}
                          movieDetails={rec.movieDetails}
                          mediaType={rec.media_type}
                          matchConfidence={rec.match_confidence}
                          isUserMovie={rec.isUserMovie}
                          availableOn={rec.available_on}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : activeTab === 'earlier' ? (
        <>
          {earlierRecs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No earlier recommendations</p>
              <p className="text-sm">All your recommendations are in the Latest tab!</p>
            </div>
          ) : (
            <>
              {/* Recalculate button */}
              <div className="mb-6 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-semibold mb-1">Recalculate Match Scores</h3>
                    <p className="text-sm text-muted-foreground">
                      Update these {earlierRecs.length} recommendation{earlierRecs.length === 1 ? '' : 's'} based on your current taste profile
                    </p>
                  </div>
                  <Button
                    onClick={handleRecalculateMatches}
                    disabled={recalculateLoading}
                    variant="outline"
                    className="border-blue-500/50 hover:bg-blue-500/10"
                  >
                    {recalculateLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        Updating...
                      </span>
                    ) : (
                      '🔄 Recalculate Matches'
                    )}
                  </Button>
                </div>
                
                {/* Success/Error messages */}
                {recalculateSuccess && (
                  <div className="mt-3 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-2 rounded-md text-sm border border-green-500/20">
                    ✓ {recalculateSuccess}
                  </div>
                )}
                {error && (
                  <div className="mt-3 bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm border border-destructive/20">
                    ✗ {error}
                  </div>
                )}
              </div>

              {/* Movie grid */}
              {isMobile ? (
                <div className="space-y-4 mb-8">
                  {earlierRecs.map(rec => (
                    <MovieCardHorizontal
                      key={rec.id}
                      id={rec.id}
                      title={rec.movie_title}
                      posterUrl={rec.posterUrl}
                      reasoning={rec.reasoning}
                      matchExplanation={rec.match_explanation}
                      feedback={rec.feedback}
                      movieDetails={rec.movieDetails}
                      mediaType={rec.media_type}
                      matchConfidence={rec.match_confidence}
                      isUserMovie={rec.isUserMovie}
                      availableOn={rec.available_on}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
                  {earlierRecs.map(rec => (
                    <MovieCardExpandable
                      key={rec.id}
                      id={rec.id}
                      title={rec.movie_title}
                      posterUrl={rec.posterUrl}
                      reasoning={rec.reasoning}
                      matchExplanation={rec.match_explanation}
                      feedback={rec.feedback}
                      movieDetails={rec.movieDetails}
                      mediaType={rec.media_type}
                      matchConfidence={rec.match_confidence}
                      isUserMovie={rec.isUserMovie}
                      availableOn={rec.available_on}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* Add Movie Form for Already Watched tab */}
          {activeTab === 'watched' && (
            <div className="mb-8">
              {!showAddMovieForm ? (
                <Button
                  onClick={() => setShowAddMovieForm(true)}
                  variant="outline"
                  size="lg"
                  className="w-full md:w-auto border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
                >
                  + Add Movie You've Watched
                </Button>
              ) : (
                <AddWatchedMovieForm 
                  onSuccess={() => {
                    setShowAddMovieForm(false)
                  }}
                />
              )}
              {showAddMovieForm && (
                <Button
                  onClick={() => setShowAddMovieForm(false)}
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {currentMovies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {activeTab === 'earlier' && (
                <>
                  <p className="text-lg mb-2">No earlier recommendations</p>
                  <p className="text-sm">Generate more recommendations and your current ones will move here.</p>
                </>
              )}
              {activeTab === 'watchlist' && (
                <>
                  <p className="text-lg mb-2">Your watchlist is empty</p>
                  <p className="text-sm mb-4">Click &quot;Add to Watchlist&quot; on any recommendation to save it for later.</p>
                  <Button variant="outline" onClick={() => setActiveTab('latest')}>
                    Browse Recommendations
                  </Button>
                </>
              )}
              {activeTab === 'watched' && (
                <>
                  <p className="text-lg mb-2">No watched movies yet</p>
                  <p className="text-sm mb-4">Add movies you've watched to improve your recommendations!</p>
                  {!showAddMovieForm && (
                    <Button variant="outline" onClick={() => setShowAddMovieForm(true)}>
                      + Add a Movie You've Watched
                    </Button>
                  )}
                </>
              )}
              {activeTab === 'not_interested' && (
                <>
                  <p className="text-lg mb-2">Nothing here yet</p>
                  <p className="text-sm">Movies you mark as &quot;Not Interested&quot; will appear here.</p>
                </>
              )}
            </div>
          ) : isMobile ? (
            <div className="space-y-4 mb-8">
              {currentMovies.map(rec => (
                <MovieCardHorizontal
                  key={rec.id}
                  id={rec.id}
                  title={rec.movie_title}
                  posterUrl={rec.posterUrl}
                  reasoning={rec.reasoning}
                  matchExplanation={rec.match_explanation}
                  feedback={rec.feedback}
                  movieDetails={rec.movieDetails}
                  mediaType={rec.media_type}
                  matchConfidence={rec.match_confidence}
                  isUserMovie={rec.isUserMovie}
                  availableOn={rec.available_on}
                />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
              {currentMovies.map(rec => (
                <MovieCardExpandable
                  key={rec.id}
                  id={rec.id}
                  title={rec.movie_title}
                  posterUrl={rec.posterUrl}
                  reasoning={rec.reasoning}
                  matchExplanation={rec.match_explanation}
                  feedback={rec.feedback}
                  movieDetails={rec.movieDetails}
                  mediaType={rec.media_type}
                  matchConfidence={rec.match_confidence}
                  isUserMovie={rec.isUserMovie}
                  availableOn={rec.available_on}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'latest' && ratedCount >= THRESHOLDS.MIN_RATINGS_FOR_MORE && (regular.length > 0 || experimental.length > 0) && (
        <div className="text-center mt-8">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20 mb-4">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          <Button 
            size="lg"
            onClick={() => setShowLoadMoreModal(true)}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </span>
            ) : (
              `🔄 Refresh Recommendations (${THRESHOLDS.TOTAL_RECOMMENDATIONS} New)`
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Based on your {ratedCount} ratings
          </p>
        </div>
      )}

      <RegenerateModal
        isOpen={showLoadMoreModal}
        onClose={() => setShowLoadMoreModal(false)}
        onSubmit={handleLoadMore}
        loading={loading}
        currentPlatforms={userPlatforms}
      />
    </div>
  )
}

