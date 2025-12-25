'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { searchMediaAction, type SearchResult } from '@/app/onboarding/actions'
import { addWatchedMovieAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'
import type { Rating } from '@/lib/types'

export function AddWatchedMovieForm({ onSuccess }: { onSuccess?: () => void }) {
  const [title, setTitle] = useState('')
  const [sentiment, setSentiment] = useState<Rating>('loved')
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState(false)
  const [tmdbMovieId, setTmdbMovieId] = useState<number>()
  const [tmdbTvId, setTmdbTvId] = useState<number>()
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>()
  const [posterUrl, setPosterUrl] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Autocomplete state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  
  const router = useRouter()

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search for autocomplete
  const handleTitleChange = (value: string) => {
    setTitle(value)
    
    // Clear TMDB data when user types
    setTmdbMovieId(undefined)
    setTmdbTvId(undefined)
    setMediaType(undefined)
    setPosterUrl(undefined)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // If query is too short, hide dropdown
    if (value.length < 2) {
      setShowDropdown(false)
      setSearchResults([])
      return
    }

    // Set loading state
    setIsSearching(true)

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMediaAction(value)
        setSearchResults(results)
        setShowDropdown(results.length > 0)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  // Handle selecting a search result
  const selectResult = (result: SearchResult) => {
    setTitle(result.title)
    setTmdbMovieId(result.mediaType === 'movie' ? result.id : undefined)
    setTmdbTvId(result.mediaType === 'tv' ? result.id : undefined)
    setMediaType(result.mediaType)
    setPosterUrl(result.posterUrl)
    setShowDropdown(false)
  }

  const resetForm = () => {
    setTitle('')
    setSentiment('loved')
    setReason('')
    setShowReason(false)
    setTmdbMovieId(undefined)
    setTmdbTvId(undefined)
    setMediaType(undefined)
    setPosterUrl(undefined)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await addWatchedMovieAction(
        title,
        sentiment,
        reason,
        tmdbMovieId,
        tmdbTvId,
        mediaType
      )
      
      if (result.success) {
        setSuccessMessage('Movie added successfully!')
        resetForm()
        router.refresh()
        if (onSuccess) onSuccess()
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(result.error || 'Failed to add movie')
      }
    } catch (err) {
      setError('Failed to add movie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 sm:p-5 md:p-6 bg-card/50">
      <h3 className="text-lg font-semibold mb-4">Add a Movie You've Watched</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Add movies you've already seen to improve your recommendations
      </p>

      {successMessage && (
        <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md border border-green-500/20 mb-4">
          <p className="text-sm font-medium">✓ {successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20 mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          {/* Poster Preview */}
          {posterUrl && (
            <div className="w-16 sm:w-20 md:w-24 flex-shrink-0">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md">
                <img 
                  src={posterUrl} 
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3 sm:space-y-4">
            {/* Search Input */}
            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="movie-search" className="text-sm font-semibold">
                Search for Movie or TV Show
              </Label>
              <div className="relative mt-2">
                <Input
                  id="movie-search"
                  placeholder="e.g., Breaking Bad, The Matrix"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0 && title.length >= 2) {
                      setShowDropdown(true)
                    }
                  }}
                  disabled={loading}
                  required
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
              
              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border-2 rounded-lg shadow-xl max-h-64 sm:max-h-80 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.mediaType}-${result.id}`}
                      type="button"
                      onClick={() => selectResult(result)}
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

            {/* Rating Selector */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">How did you feel about it?</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'loved' as Rating, label: 'Loved', emoji: '❤️', color: 'hover:bg-rose-100 dark:hover:bg-rose-950', activeColor: 'bg-rose-100 dark:bg-rose-950 border-rose-500' },
                  { value: 'liked' as Rating, label: 'Liked', emoji: '👍', color: 'hover:bg-green-100 dark:hover:bg-green-950', activeColor: 'bg-green-100 dark:bg-green-950 border-green-500' },
                  { value: 'meh' as Rating, label: 'Meh', emoji: '😐', color: 'hover:bg-yellow-100 dark:hover:bg-yellow-950', activeColor: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-500' },
                  { value: 'hated' as Rating, label: 'Hated', emoji: '👎', color: 'hover:bg-gray-100 dark:hover:bg-gray-800', activeColor: 'bg-gray-100 dark:bg-gray-800 border-gray-500' }
                ].map(rating => (
                  <button
                    key={rating.value}
                    type="button"
                    onClick={() => {
                      setSentiment(rating.value)
                      if (!showReason && reason === '') {
                        setShowReason(true)
                      }
                    }}
                    disabled={loading}
                    className={`flex flex-col items-center justify-center p-2 min-h-[44px] rounded-lg border-2 transition-all ${
                      sentiment === rating.value 
                        ? rating.activeColor 
                        : `${rating.color} border-border`
                    }`}
                  >
                    <span className="text-xl">{rating.emoji}</span>
                    <span className="text-xs font-medium mt-1">{rating.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Reason */}
            <div>
              {!showReason ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReason(true)}
                  className="text-xs"
                >
                  + Add reason (optional)
                </Button>
              ) : (
                <div>
                  <Label htmlFor="reason" className="text-sm font-semibold">
                    Why? (Optional)
                  </Label>
                  <textarea
                    id="reason"
                    placeholder="What did you think about it?"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg bg-background min-h-[80px] mt-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={!title.trim() || loading}
            className="flex-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Adding...
              </span>
            ) : (
              'Add to Already Watched'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

