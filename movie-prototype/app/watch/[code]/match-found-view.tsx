'use client'

import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { useRouter } from 'next/navigation'
import { Star, ExternalLink, RotateCcw, Home } from 'lucide-react'
import type { JointRecommendation } from '@/lib/types'

interface MatchFoundViewProps {
  movie: JointRecommendation
}

// Platform streaming URLs (best effort - some may require manual search)
const PLATFORM_URLS: Record<string, string> = {
  'Netflix': 'https://www.netflix.com/search?q=',
  'Hulu': 'https://www.hulu.com/search?q=',
  'Disney+': 'https://www.disneyplus.com/search?q=',
  'Amazon Prime Video': 'https://www.amazon.com/s?k=',
  'Prime Video': 'https://www.amazon.com/s?k=',
  'HBO Max': 'https://www.max.com/search?q=',
  'Max': 'https://www.max.com/search?q=',
  'Apple TV+': 'https://tv.apple.com/search?term=',
  'Peacock': 'https://www.peacocktv.com/search?q=',
  'Paramount+': 'https://www.paramountplus.com/search?q=',
}

export function MatchFoundView({ movie }: MatchFoundViewProps) {
  const router = useRouter()

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null

  const handleFindAnother = async () => {
    // For now, just redirect to recommendations
    // In future, could start a new session
    router.push('/recommendations')
  }

  const handleDone = () => {
    router.push('/recommendations')
  }

  const openInPlatform = (platform: string) => {
    const baseUrl = PLATFORM_URLS[platform]
    if (baseUrl) {
      const searchUrl = baseUrl + encodeURIComponent(movie.title)
      window.open(searchUrl, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Celebration */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold">It&apos;s a Match!</h1>
          <p className="text-muted-foreground mt-1">You both want to watch this</p>
        </div>

        {/* Movie Card */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-lg">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full aspect-[2/3] object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
              <span className="text-6xl">🎬</span>
            </div>
          )}

          <div className="p-5">
            <h2 className="text-2xl font-bold">{movie.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 flex-wrap">
              {movie.vote_average > 0 && (
                <>
                  <span className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1 fill-yellow-500" />
                    {movie.vote_average.toFixed(1)}
                  </span>
                  <span>•</span>
                </>
              )}
              {movie.genres.length > 0 && (
                <>
                  <span>{movie.genres.slice(0, 3).join(', ')}</span>
                  <span>•</span>
                </>
              )}
              <span>{movie.release_year}</span>
              {movie.runtime && (
                <>
                  <span>•</span>
                  <span>{movie.runtime} min</span>
                </>
              )}
            </div>

            {movie.overview && (
              <p className="text-sm text-muted-foreground mt-4">
                {movie.overview}
              </p>
            )}
          </div>
        </div>

        {/* Streaming Platforms */}
        {movie.streaming_platforms.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Watch on
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {movie.streaming_platforms.map(platform => (
                <Button
                  key={platform}
                  variant="outline"
                  size="sm"
                  onClick={() => openInPlatform(platform)}
                  className="gap-2"
                >
                  {platform}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleFindAnother}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Find Another
          </Button>
          <Button
            className="flex-1"
            onClick={handleDone}
          >
            <Home className="w-4 h-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
