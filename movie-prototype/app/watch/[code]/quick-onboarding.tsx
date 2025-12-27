'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search } from 'lucide-react'
import { searchMediaAction, type SearchResult } from '@/app/onboarding/actions'
import { saveGuestMoviesAction, type QuickMovie } from './actions'
import type { Rating } from '@/lib/types'

const RATING_OPTIONS: { value: Rating; label: string; emoji: string }[] = [
  { value: 'loved', label: 'Loved', emoji: '❤️' },
  { value: 'liked', label: 'Liked', emoji: '👍' },
  { value: 'meh', label: 'Meh', emoji: '😐' },
  { value: 'hated', label: 'Hated', emoji: '👎' },
]

interface QuickOnboardingProps {
  onComplete: () => void
  guestSessionId: string
}

export function QuickOnboarding({ onComplete, guestSessionId }: QuickOnboardingProps) {
  const [movies, setMovies] = useState<QuickMovie[]>([
    { title: '', sentiment: 'loved', reason: '' },
    { title: '', sentiment: 'loved', reason: '' },
    { title: '', sentiment: 'loved', reason: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({})
  const [showDropdown, setShowDropdown] = useState<Record<number, boolean>>({})
  const [isSearching, setIsSearching] = useState<Record<number, boolean>>({})
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

  const updateMovie = (index: number, field: keyof QuickMovie, value: string | number) => {
    const updated = [...movies]
    updated[index] = { ...updated[index], [field]: value }
    setMovies(updated)
  }

  // Debounced search
  const handleTitleChange = (index: number, value: string) => {
    updateMovie(index, 'title', value)

    // Clear existing timeout
    if (searchTimeoutRef.current[index]) {
      clearTimeout(searchTimeoutRef.current[index])
    }

    if (value.length < 2) {
      setSearchResults(prev => ({ ...prev, [index]: [] }))
      setShowDropdown(prev => ({ ...prev, [index]: false }))
      return
    }

    // Debounce search
    searchTimeoutRef.current[index] = setTimeout(async () => {
      setIsSearching(prev => ({ ...prev, [index]: true }))
      try {
        const results = await searchMediaAction(value)
        setSearchResults(prev => ({ ...prev, [index]: results }))
        setShowDropdown(prev => ({ ...prev, [index]: results.length > 0 }))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(prev => ({ ...prev, [index]: false }))
      }
    }, 300)
  }

  const selectSearchResult = (index: number, result: SearchResult) => {
    const updated = [...movies]
    updated[index] = {
      ...updated[index],
      title: result.title,
      tmdbMovieId: result.mediaType === 'movie' ? result.id : undefined,
      tmdbTvId: result.mediaType === 'tv' ? result.id : undefined,
      mediaType: result.mediaType,
    }
    setMovies(updated)
    setShowDropdown(prev => ({ ...prev, [index]: false }))
  }

  const isComplete = movies.every(m => m.title.trim() && m.reason.trim())

  const handleSubmit = async () => {
    if (!isComplete) return

    setLoading(true)
    setError(null)

    try {
      const result = await saveGuestMoviesAction(guestSessionId, movies)
      if (result.success) {
        onComplete()
      } else {
        setError(result.error || 'Failed to save preferences')
      }
    } catch (err) {
      console.error('Error saving movies:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {movies.map((movie, index) => (
        <div key={index} className="bg-card border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Movie {index + 1}
            </span>
          </div>

          {/* Title with search */}
          <div className="relative" ref={el => { dropdownRefs.current[index] = el }}>
            <Label htmlFor={`title-${index}`} className="text-sm font-medium">
              Title
            </Label>
            <div className="relative mt-1">
              <Input
                id={`title-${index}`}
                value={movie.title}
                onChange={e => handleTitleChange(index, e.target.value)}
                onFocus={() => {
                  if (searchResults[index]?.length > 0) {
                    setShowDropdown(prev => ({ ...prev, [index]: true }))
                  }
                }}
                placeholder="Search for a movie or TV show..."
                className="pr-10"
              />
              {isSearching[index] ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Search dropdown */}
            {showDropdown[index] && searchResults[index]?.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults[index].map(result => (
                  <button
                    key={`${result.mediaType}-${result.id}`}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3"
                    onClick={() => selectSearchResult(index, result)}
                  >
                    {result.posterUrl ? (
                      <img
                        src={result.posterUrl}
                        alt=""
                        className="w-8 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.year} • {result.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div>
            <Label className="text-sm font-medium">How did you feel about it?</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {RATING_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateMovie(index, 'sentiment', option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    movie.sentiment === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor={`reason-${index}`} className="text-sm font-medium">
              Why? (brief reason)
            </Label>
            <Input
              id={`reason-${index}`}
              value={movie.reason}
              onChange={e => updateMovie(index, 'reason', e.target.value)}
              placeholder="e.g., Great plot twists, loved the characters..."
              className="mt-1"
              maxLength={200}
            />
          </div>
        </div>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={!isComplete || loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          'Continue'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Rate all 3 movies to continue
      </p>
    </div>
  )
}
