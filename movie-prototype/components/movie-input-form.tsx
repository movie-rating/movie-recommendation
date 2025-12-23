'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { submitMoviesAction } from '@/app/onboarding/actions'
import { THRESHOLDS, RATING_MAP } from '@/lib/constants'
import type { Rating } from '@/lib/types'

type Movie = { title: string; sentiment: Rating; reason: string }

export function MovieInputForm() {
  const [movies, setMovies] = useState<Movie[]>([
    { title: '', sentiment: 'loved', reason: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {movies.map((movie, idx) => (
        <div key={idx} className="border rounded-lg p-6 space-y-4 bg-card">
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <Label htmlFor={`title-${idx}`}>Movie or TV Show</Label>
              <Input
                id={`title-${idx}`}
                placeholder="e.g., Breaking Bad, The Matrix"
                value={movie.title}
                onChange={e => updateMovie(idx, 'title', e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <Label htmlFor={`sentiment-${idx}`}>Rating</Label>
              <select
                id={`sentiment-${idx}`}
                value={movie.sentiment}
                onChange={e => updateMovie(idx, 'sentiment', e.target.value as Rating)}
                className="w-36 px-3 py-2 border rounded-md bg-background"
                disabled={loading}
              >
                <option value="loved">{RATING_MAP.loved}</option>
                <option value="liked">{RATING_MAP.liked}</option>
                <option value="meh">{RATING_MAP.meh}</option>
                <option value="hated">{RATING_MAP.hated}</option>
              </select>
            </div>

            {movies.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMovie(idx)}
                className="mt-6"
              >
                ✕
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor={`reason-${idx}`}>Why? Be specific</Label>
            <textarea
              id={`reason-${idx}`}
              placeholder="What did you think about it? (plot, acting, themes, etc.)"
              value={movie.reason}
              onChange={e => updateMovie(idx, 'reason', e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background min-h-[80px]"
              disabled={loading}
              required
            />
          </div>
        </div>
      ))}

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
  )
}

