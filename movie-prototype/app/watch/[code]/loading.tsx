import { Header } from '@/components/header'

export default function WatchSessionLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>

        {/* Movie card skeleton */}
        <div className="bg-card border rounded-xl overflow-hidden">
          {/* Poster skeleton */}
          <div className="w-full aspect-[2/3] bg-muted animate-pulse" />

          <div className="p-4 space-y-3">
            {/* Title */}
            <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />

            {/* Meta info */}
            <div className="flex gap-2">
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-muted rounded animate-pulse" />
            </div>

            {/* Platforms */}
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Voting buttons skeleton */}
        <div className="flex gap-4 mt-6">
          <div className="flex-1 h-14 bg-muted rounded-md animate-pulse" />
          <div className="flex-1 h-14 bg-muted rounded-md animate-pulse" />
        </div>

        {/* Status text skeleton */}
        <div className="flex justify-center mt-4">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
