'use client'
import { useState } from 'react'
import { MovieCardExpandable } from './movie-card-expandable'
import { GeneManager } from './gene-manager'
import { Button } from './ui/button'
import { generateMoreRecommendationsAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'
import { THRESHOLDS } from '@/lib/constants'
import type { RecommendationWithFeedback, TasteProfile, TasteGene } from '@/lib/types'

type TabId = 'to_watch' | 'watchlist' | 'watched' | 'not_interested'

export function RecommendationsTabs({ 
  recommendations,
  ratedCount,
  tasteProfile,
  topGenes
}: {
  recommendations: RecommendationWithFeedback[]
  ratedCount: number
  tasteProfile?: TasteProfile | null
  topGenes: TasteGene[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>('to_watch')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-tabs.tsx:29',message:'Filtering recommendations',data:{totalRecs:recommendations.length,withFeedback:recommendations.filter(r=>r.feedback).length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H4'})}).catch(()=>{});
  // #endregion
  const toWatch = recommendations
    .filter(r => !r.feedback)
    .sort((a, b) => (b.match_confidence || 0) - (a.match_confidence || 0))
  const watchlist = recommendations.filter(r => r.feedback?.status === 'watchlist')
  const watched = recommendations.filter(r => r.feedback?.status === 'watched')
  const notInterested = recommendations.filter(r => r.feedback?.status === 'not_interested')
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-tabs.tsx:37',message:'Filtered counts',data:{toWatch:toWatch.length,watchlist:watchlist.length,watched:watched.length,notInterested:notInterested.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  const experimental = toWatch.filter(r => r.is_experimental)
  const regular = toWatch.filter(r => !r.is_experimental)

  const handleLoadMore = async () => {
    setLoading(true)
    setError(null)
    const result = await generateMoreRecommendationsAction()
    setLoading(false)
    
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to generate recommendations')
    }
  }

  const tabs = [
    { id: 'to_watch' as TabId, label: 'New Recommendations', count: toWatch.length },
    { id: 'watchlist' as TabId, label: 'My Watchlist', count: watchlist.length },
    { id: 'watched' as TabId, label: 'Already Watched', count: watched.length },
    { id: 'not_interested' as TabId, label: 'Not Interested', count: notInterested.length },
  ]

  const currentMovies = activeTab === 'to_watch' ? toWatch 
    : activeTab === 'watchlist' ? watchlist
    : activeTab === 'watched' ? watched 
    : notInterested

  const hasAnyFeedback = watched.length > 0 || notInterested.length > 0

  return (
    <div>
      <GeneManager genes={topGenes || []} sessionHasFeedback={hasAnyFeedback} />
      
      <div className="flex gap-2 border-b mb-8 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === 'to_watch' ? (
        <>
          {regular.length === 0 && experimental.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No movies in this category yet</p>
              {recommendations.length > 0 && (
                <p className="text-sm">All recommendations have been reviewed!</p>
              )}
            </div>
          ) : (
            <>
              {/* Main recommendations */}
              {regular.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-4">Recommended For You</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {regular.map(rec => (
                      <MovieCardExpandable
                        key={rec.id}
                        id={rec.id}
                        title={rec.movie_title}
                        posterUrl={rec.posterUrl}
                        reasoning={rec.reasoning}
                        feedback={rec.feedback}
                        movieDetails={rec.movieDetails}
                        mediaType={rec.media_type}
                        matchConfidence={rec.match_confidence}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Experimental section */}
              {experimental.length > 0 && (
                <div className="mb-12 p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🎲</span>
                    <h2 className="text-2xl font-bold">Try Something Different</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Based on your taste profile, these might surprise you in a good way
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {experimental.map(rec => (
                      <MovieCardExpandable
                        key={rec.id}
                        id={rec.id}
                        title={rec.movie_title}
                        posterUrl={rec.posterUrl}
                        reasoning={rec.reasoning}
                        feedback={rec.feedback}
                        experimental={true}
                        movieDetails={rec.movieDetails}
                        mediaType={rec.media_type}
                        matchConfidence={rec.match_confidence}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        currentMovies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">No movies in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
            {currentMovies.map(rec => (
              <MovieCardExpandable
                key={rec.id}
                id={rec.id}
                title={rec.movie_title}
                posterUrl={rec.posterUrl}
                reasoning={rec.reasoning}
                feedback={rec.feedback}
                movieDetails={rec.movieDetails}
                mediaType={rec.media_type}
                matchConfidence={rec.match_confidence}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'to_watch' && ratedCount >= THRESHOLDS.MIN_RATINGS_FOR_MORE && (regular.length > 0 || experimental.length > 0) && (
        <div className="text-center mt-8">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20 mb-4">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          <Button 
            size="lg"
            onClick={handleLoadMore}
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
    </div>
  )
}

