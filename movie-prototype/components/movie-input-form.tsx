'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Check } from 'lucide-react'
import { submitMoviesAction, searchMediaAction, type SearchResult } from '@/app/onboarding/actions'
import { THRESHOLDS } from '@/lib/constants'
import type { Rating } from '@/lib/types'
import { StreamingPlatformSelector } from './streaming-platform-selector'

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
  const [loadingStep, setLoadingStep] = useState<'analyzing' | 'generating' | 'enriching' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<'movies' | 'platforms'>('movies')
  const router = useRouter()
  
  // Autocomplete state
  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({})
  const [showDropdown, setShowDropdown] = useState<Record<number, boolean>>({})
  const [isSearching, setIsSearching] = useState<Record<number, boolean>>({})
  const [searchError, setSearchError] = useState<Record<number, string | null>>({})
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

  // Progressive box reveal: automatically add boxes as they are completed (up to 3)
  useEffect(() => {
    const completedCount = movies.filter(m => m.title.trim() && m.reason.trim()).length
    // If all current boxes are completed and we have fewer than 3 boxes, add another
    if (completedCount === movies.length && movies.length < THRESHOLDS.MIN_MOVIES_ONBOARDING) {
      setMovies([...movies, { title: '', sentiment: 'loved', reason: '' }])
    }
  }, [movies])

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

    // Set loading state and clear previous error
    setIsSearching(prev => ({ ...prev, [index]: true }))
    setSearchError(prev => ({ ...prev, [index]: null }))

    // Debounce search with timeout handling
    searchTimeoutRef.current[index] = setTimeout(async () => {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Search timed out')), 8000)
        })

        // Race between search and timeout
        const results = await Promise.race([
          searchMediaAction(value),
          timeoutPromise
        ])

        setSearchResults(prev => ({ ...prev, [index]: results }))
        setShowDropdown(prev => ({ ...prev, [index]: results.length > 0 }))
        setSearchError(prev => ({ ...prev, [index]: null }))
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults(prev => ({ ...prev, [index]: [] }))
        setSearchError(prev => ({
          ...prev,
          [index]: error instanceof Error && error.message === 'Search timed out'
            ? 'Search timed out. Please try again.'
            : 'Search failed. Please try again.'
        }))
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

  const handleNext = () => {
    setCurrentStep('platforms')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setCurrentStep('movies')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setLoadingStep('analyzing')

    // Simulate progress steps while the API call runs
    const stepTimers: NodeJS.Timeout[] = []
    stepTimers.push(setTimeout(() => setLoadingStep('generating'), 2000))
    stepTimers.push(setTimeout(() => setLoadingStep('enriching'), 8000))

    try {
      const result = await submitMoviesAction(movies, selectedPlatforms)
      // Clear timers on completion
      stepTimers.forEach(clearTimeout)

      if (result.success) {
        // Store warning in sessionStorage to display on recommendations page
        if (result.warning) {
          sessionStorage.setItem('onboarding_warning', result.warning)
        }
        router.push('/recommendations')
      } else {
        setError(result.error || 'Something went wrong')
        setLoadingStep(null)
      }
    } catch {
      stepTimers.forEach(clearTimeout)
      setError('Failed to generate recommendations')
      setLoadingStep(null)
    } finally {
      setLoading(false)
    }
  }

  const canProceedToNext = movies.length >= THRESHOLDS.MIN_MOVIES_ONBOARDING &&
    movies.every(m => m.title.trim() && m.reason.trim())

  const completedCount = movies.filter(m => m.title.trim() && m.reason.trim()).length
  const hasMinimum = completedCount >= THRESHOLDS.MIN_MOVIES_ONBOARDING
  // Show progress toward minimum until met, then show progress toward maximum
  const progressPercent = hasMinimum
    ? Math.min(100, (completedCount / THRESHOLDS.MAX_MOVIES_ONBOARDING) * 100)
    : (completedCount / THRESHOLDS.MIN_MOVIES_ONBOARDING) * 100

  // Render platform selection step
  if (currentStep === 'platforms') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Choose Your Streaming Platforms
          </h2>
          <p className="text-muted-foreground">
            Select platforms to get more targeted recommendations (optional)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 rounded-xl p-6 bg-card">
            <StreamingPlatformSelector 
              selected={selectedPlatforms}
              onChange={setSelectedPlatforms}
              compact={false}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
              <p className="font-semibold mb-1">Error generating recommendations</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading && (
            <div className="bg-primary/10 text-primary px-4 py-4 rounded-md border border-primary/20">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  <p className="font-semibold">
                    {loadingStep === 'analyzing' && 'Analyzing your preferences...'}
                    {loadingStep === 'generating' && 'Generating personalized recommendations...'}
                    {loadingStep === 'enriching' && 'Loading movie details and posters...'}
                  </p>
                </div>

                {/* Step progress indicator */}
                <div className="flex items-center gap-2 text-sm">
                  <div className={`flex items-center gap-1.5 ${loadingStep === 'analyzing' ? 'text-primary font-medium' : 'text-primary/60'}`}>
                    {loadingStep === 'analyzing' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <span>Analyze</span>
                  </div>

                  <div className={`w-8 h-0.5 ${loadingStep !== 'analyzing' ? 'bg-primary' : 'bg-primary/30'}`} />

                  <div className={`flex items-center gap-1.5 ${loadingStep === 'generating' ? 'text-primary font-medium' : loadingStep === 'enriching' ? 'text-primary/60' : 'text-primary/40'}`}>
                    {loadingStep === 'generating' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : loadingStep === 'enriching' ? (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-primary/40" />
                    )}
                    <span>Generate</span>
                  </div>

                  <div className={`w-8 h-0.5 ${loadingStep === 'enriching' ? 'bg-primary' : 'bg-primary/30'}`} />

                  <div className={`flex items-center gap-1.5 ${loadingStep === 'enriching' ? 'text-primary font-medium' : 'text-primary/40'}`}>
                    {loadingStep === 'enriching' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-primary/40" />
                    )}
                    <span>Finalize</span>
                  </div>
                </div>

                <p className="text-xs text-primary/70">This usually takes 10-15 seconds</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBack}
              disabled={loading}
              className="min-w-[150px]"
            >
              ← Back to Movies
            </Button>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="min-w-[200px] flex-1"
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
        </form>
      </div>
    )
  }

  // Render movie input step
  return (
    <>
      <div className="mb-8 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-4 -mx-4 px-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {hasMinimum ? 'Ready to continue' : `${THRESHOLDS.MIN_MOVIES_ONBOARDING - completedCount} more needed`}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {completedCount}/{hasMinimum ? THRESHOLDS.MAX_MOVIES_ONBOARDING : THRESHOLDS.MIN_MOVIES_ONBOARDING}
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
      {movies.map((movie, idx) => {
        const hasContent = movie.title.trim() && movie.reason.trim()

        return (
          <div
            key={idx}
            className={`relative border rounded-xl overflow-hidden bg-card fade-in transition-all duration-300 ${
              hasContent ? 'border-border shadow-sm' : 'border-dashed border-muted'
            }`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Header Section - Poster + Title */}
            <div className="p-4 sm:p-5">
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

                  {/* Search Error */}
                  {searchError[idx] && !isSearching[idx] && (
                    <div className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {searchError[idx]}
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
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3 block">
                  Your Rating
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'loved' as Rating, label: 'Loved it' },
                    { value: 'liked' as Rating, label: 'Liked it' },
                    { value: 'meh' as Rating, label: 'It was okay' },
                    { value: 'hated' as Rating, label: 'Disliked' }
                  ].map(rating => (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => updateMovie(idx, 'sentiment', rating.value)}
                      disabled={loading}
                      className={`p-3 min-h-[48px] rounded-lg border text-sm font-medium transition-all duration-150 ${
                        movie.sentiment === rating.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      aria-label={`Rate as ${rating.label}`}
                      aria-pressed={movie.sentiment === rating.value}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor={`reason-${idx}`} className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Why did you feel this way?
                  </Label>
                  {movie.reason.trim() && (
                    <Check className="w-4 h-4 text-success" />
                  )}
                </div>
                <textarea
                  id={`reason-${idx}`}
                  placeholder="What specifically did you like or dislike? The more detail, the better your recommendations."
                  value={movie.reason}
                  onChange={e => updateMovie(idx, 'reason', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all resize-none text-sm leading-relaxed placeholder:text-muted-foreground/60"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {completedCount >= THRESHOLDS.MIN_MOVIES_ONBOARDING && movies.length < THRESHOLDS.MAX_MOVIES_ONBOARDING && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={addMovie}
            disabled={loading}
          >
            + Add More ({movies.length}/{THRESHOLDS.MAX_MOVIES_ONBOARDING})
          </Button>
        )}
        
        <Button 
          type="button"
          onClick={handleNext}
          disabled={!canProceedToNext}
          className="min-w-[200px]"
        >
          Next: Choose Platforms →
        </Button>
      </div>

      {!loading && (
        <p className="text-sm text-muted-foreground text-center">
          {movies.length < THRESHOLDS.MIN_MOVIES_ONBOARDING 
            ? `Complete at least ${THRESHOLDS.MIN_MOVIES_ONBOARDING} to continue`
            : 'Click Next to choose streaming platforms'
          }
        </p>
      )}
    </div>
    </>
  )
}

