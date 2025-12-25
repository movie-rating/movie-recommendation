'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { submitMoviesAction, searchMediaAction, type SearchResult } from '@/app/onboarding/actions'
import { THRESHOLDS, RATING_MAP } from '@/lib/constants'
import type { Rating } from '@/lib/types'

type Movie = { 
  title: string
  sentiment: Rating
  reason: string
  tmdbMovieId?: number
  tmdbTvId?: number
  mediaType?: 'movie' | 'tv'
  posterUrl?: string
}

export function MovieInputForm() {
  const [movies, setMovies] = useState<Movie[]>([
    { title: '', sentiment: 'loved', reason: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  // Autocomplete state
  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({})
  const [showDropdown, setShowDropdown] = useState<Record<number, boolean>>({})
  const [isSearching, setIsSearching] = useState<Record<number, boolean>>({})
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({})
  const searchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({})
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach(key => {
        const idx = parseInt(key)
        const ref = dropdownRefs.current[idx]
        if (ref && !ref.contains(event.target as Node)) {
          setShowDropdown(prev => ({ ...prev, [idx]: false }))
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addMovie = () => {
    if (movies.length < THRESHOLDS.MAX_MOVIES_ONBOARDING) {
      setMovies([...movies, { title: '', sentiment: 'loved', reason: '' }])
    }
  }

  const updateMovie = (index: number, field: keyof Movie, value: string) => {
    const updated = [...movies]
    updated[index] = { ...updated[index], [field]: value }
    setMovies(updated)
  }

  const removeMovie = (index: number) => {
    if (movies.length > 1) {
      setMovies(movies.filter((_, i) => i !== index))
    }
  }

  // Debounced search for autocomplete
  const handleTitleChange = (index: number, value: string) => {
    // Update the movie title
    const updated = [...movies]
    updated[index] = { ...updated[index], title: value }
    setMovies(updated)
    
    // Store search query
    setSearchQuery(prev => ({ ...prev, [index]: value }))

    // Clear existing timeout
    if (searchTimeoutRef.current[index]) {
      clearTimeout(searchTimeoutRef.current[index])
    }

    // If query is too short, hide dropdown
    if (value.length < 2) {
      setShowDropdown(prev => ({ ...prev, [index]: false }))
      setSearchResults(prev => ({ ...prev, [index]: [] }))
      return
    }

    // Set loading state
    setIsSearching(prev => ({ ...prev, [index]: true }))

    // Debounce search
    searchTimeoutRef.current[index] = setTimeout(async () => {
      try {
        const results = await searchMediaAction(value)
        setSearchResults(prev => ({ ...prev, [index]: results }))
        setShowDropdown(prev => ({ ...prev, [index]: results.length > 0 }))
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults(prev => ({ ...prev, [index]: [] }))
      } finally {
        setIsSearching(prev => ({ ...prev, [index]: false }))
      }
    }, 300)
  }

  // Handle selecting a search result
  const selectResult = (index: number, result: SearchResult) => {
    const updated = [...movies]
    updated[index] = {
      ...updated[index],
      title: result.title,
      tmdbMovieId: result.mediaType === 'movie' ? result.id : undefined,
      tmdbTvId: result.mediaType === 'tv' ? result.id : undefined,
      mediaType: result.mediaType,
      posterUrl: result.posterUrl
    }
    setMovies(updated)
    setShowDropdown(prev => ({ ...prev, [index]: false }))
    setSearchQuery(prev => ({ ...prev, [index]: result.title }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await submitMoviesAction(movies)
      if (result.success) {
        router.push('/recommendations')
      } else {
        setError(result.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Failed to generate recommendations')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = movies.length >= THRESHOLDS.MIN_MOVIES_ONBOARDING && 
    movies.every(m => m.title.trim() && m.reason.trim()) &&
    !loading

  const completedCount = movies.filter(m => m.title.trim() && m.reason.trim()).length
  const progressPercent = Math.min(100, (completedCount / THRESHOLDS.MIN_MOVIES_ONBOARDING) * 100)

  const getRatingColor = (rating: Rating) => {
    switch (rating) {
      case 'loved': return 'border-rose-500/50 bg-rose-50/5'
      case 'liked': return 'border-green-500/50 bg-green-50/5'
      case 'meh': return 'border-yellow-500/50 bg-yellow-50/5'
      case 'hated': return 'border-gray-500/50 bg-gray-50/5'
      default: return ''
    }
  }

  return (
    <>
      <div className="mb-8 sticky top-0 bg-background z-10 pb-4 pt-2">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground font-medium">Your Progress</span>
          <span className="font-semibold text-lg">
            {completedCount}/{THRESHOLDS.MIN_MOVIES_ONBOARDING} completed
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {completedCount >= THRESHOLDS.MIN_MOVIES_ONBOARDING && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-3 flex items-center gap-2 font-medium animate-in slide-in-from-bottom-4">
            <span className="text-lg">✓</span> Ready to generate recommendations!
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
      {movies.map((movie, idx) => {
        const hasContent = movie.title.trim() && movie.reason.trim()
        const cardBorderClass = hasContent ? getRatingColor(movie.sentiment) : 'border-dashed border-muted'
        
        return (
          <div 
            key={idx} 
            className={`relative border-2 rounded-2xl overflow-hidden bg-card fade-in transition-all duration-300 ${cardBorderClass}`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Header Section - Poster + Title */}
            <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 p-4 sm:p-5">
              <div className="flex gap-4">
                {/* Poster */}
                <div className="w-24 sm:w-28 flex-shrink-0">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-lg ring-1 ring-black/5">
                    {movie.posterUrl ? (
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <svg className="w-12 h-12 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title Search */}
                <div className="flex-1 relative" ref={el => { dropdownRefs.current[idx] = el }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Label htmlFor={`title-${idx}`} className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Movie or TV Show
                    </Label>
                    {movies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMovie(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 -mt-1"
                        aria-label="Remove"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Input
                    id={`title-${idx}`}
                    placeholder="Search for a title..."
                    value={movie.title}
                    onChange={e => handleTitleChange(idx, e.target.value)}
                    onFocus={() => {
                      if (searchResults[idx]?.length > 0 && searchQuery[idx]?.length >= 2) {
                        setShowDropdown(prev => ({ ...prev, [idx]: true }))
                      }
                    }}
                    disabled={loading}
                    required
                    autoComplete="off"
                    className="text-base font-medium h-11 bg-background/80 backdrop-blur-sm"
                  />
                  {isSearching[idx] && (
                    <div className="absolute right-3 top-9">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown[idx] && searchResults[idx]?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border-2 rounded-lg shadow-xl max-h-80 sm:max-h-96 overflow-y-auto">
                      {searchResults[idx].map((result) => (
                        <button
                          key={`${result.mediaType}-${result.id}`}
                          type="button"
                          onClick={() => selectResult(idx, result)}
                          className="w-full flex items-start gap-2.5 p-2.5 hover:bg-accent transition-colors text-left border-b last:border-b-0 min-h-[60px]"
                        >
                          <img 
                            src={result.posterUrl} 
                            alt={result.title}
                            className="w-10 h-[60px] object-cover rounded shadow-sm flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0 py-0.5">
                            <div className="font-semibold truncate text-sm leading-tight mb-1">{result.title}</div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">{result.year}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {result.mediaType === 'movie' ? 'Movie' : 'TV Show'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section - Rating + Reason */}
            <div className="p-4 sm:p-5 space-y-5">
              {/* Rating Selector */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3 block">
                  Your Rating
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'loved' as Rating, label: 'Loved', emoji: '❤️', gradient: 'from-rose-500/10 to-rose-600/5', border: 'border-rose-500/30', activeBg: 'bg-rose-500/15', activeBorder: 'border-rose-500', activeRing: 'ring-rose-500/20' },
                    { value: 'liked' as Rating, label: 'Liked', emoji: '👍', gradient: 'from-green-500/10 to-green-600/5', border: 'border-green-500/30', activeBg: 'bg-green-500/15', activeBorder: 'border-green-500', activeRing: 'ring-green-500/20' },
                    { value: 'meh' as Rating, label: 'Meh', emoji: '😐', gradient: 'from-yellow-500/10 to-yellow-600/5', border: 'border-yellow-500/30', activeBg: 'bg-yellow-500/15', activeBorder: 'border-yellow-500', activeRing: 'ring-yellow-500/20' },
                    { value: 'hated' as Rating, label: 'Hated', emoji: '👎', gradient: 'from-gray-500/10 to-gray-600/5', border: 'border-gray-500/30', activeBg: 'bg-gray-500/15', activeBorder: 'border-gray-500', activeRing: 'ring-gray-500/20' }
                  ].map(rating => (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => updateMovie(idx, 'sentiment', rating.value)}
                      disabled={loading}
                      className={`relative flex flex-col items-center justify-center p-3 min-h-[70px] rounded-xl border-2 transition-all duration-200 ${
                        movie.sentiment === rating.value 
                          ? `${rating.activeBg} ${rating.activeBorder} ring-2 ${rating.activeRing} scale-105` 
                          : `bg-gradient-to-br ${rating.gradient} ${rating.border} hover:scale-105`
                      }`}
                      aria-label={`Rate as ${rating.label}`}
                      aria-pressed={movie.sentiment === rating.value}
                    >
                      <span className="text-2xl mb-1.5">{rating.emoji}</span>
                      <span className="text-xs font-semibold">{rating.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Textarea */}
              <div>
                <Label htmlFor={`reason-${idx}`} className="text-xs uppercase tracking-wide text-muted-foreground font-semibold block mb-2">
                  Why? Tell us more
                </Label>
                <textarea
                  id={`reason-${idx}`}
                  placeholder="What did you love/hate about it? Be specific about plot, acting, pacing, themes..."
                  value={movie.reason}
                  onChange={e => updateMovie(idx, 'reason', e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-xl bg-background/50 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none text-sm leading-relaxed"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>
        )
      })}

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
          <p className="font-semibold mb-1">Error generating recommendations</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-2">Please try again or contact support if the issue persists.</p>
        </div>
      )}

      {loading && (
        <div className="bg-primary/10 text-primary px-4 py-3 rounded-md border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <div>
              <p className="font-semibold">Generating your recommendations...</p>
              <p className="text-sm">This usually takes 10-15 seconds</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {movies.length < THRESHOLDS.MAX_MOVIES_ONBOARDING && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={addMovie}
            disabled={loading}
          >
            + Add Movie ({movies.length}/{THRESHOLDS.MAX_MOVIES_ONBOARDING})
          </Button>
        )}
        
        <Button 
          type="submit" 
          disabled={!canSubmit}
          className="min-w-[200px]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Generating...
            </span>
          ) : (
            'Get Recommendations'
          )}
        </Button>
      </div>

      {!loading && (
        <p className="text-sm text-muted-foreground text-center">
          {movies.length < THRESHOLDS.MIN_MOVIES_ONBOARDING 
            ? `Add at least ${THRESHOLDS.MIN_MOVIES_ONBOARDING - movies.length} more to continue`
            : 'Ready to generate! Takes ~10 seconds.'
          }
        </p>
      )}
    </form>
    </>
  )
}

