import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  )
}

export function MovieCardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Poster with badge placeholders */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted">
        <Skeleton className="absolute top-2 left-2 h-6 w-10 rounded-full" />
        <Skeleton className="absolute top-2 right-2 h-5 w-16 rounded" />
      </div>
      {/* Title */}
      <Skeleton className="h-4 w-4/5" />
      {/* Meta info */}
      <Skeleton className="h-3 w-1/2" />
      {/* Buttons */}
      <div className="space-y-2 pt-1">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      </div>
      {/* More info link */}
      <Skeleton className="h-4 w-16 mx-auto" />
    </div>
  )
}

export function MovieCardHorizontalSkeleton() {
  return (
    <div className="flex gap-4 p-4 border border-border rounded-xl bg-card">
      {/* Poster */}
      <div className="relative w-[100px] flex-shrink-0">
        <Skeleton className="aspect-[2/3] rounded-lg" />
        <Skeleton className="absolute top-1.5 left-1.5 h-4 w-8 rounded-full" />
      </div>
      <div className="flex-1 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        {/* Meta */}
        <Skeleton className="h-3 w-1/2" />
        {/* Buttons */}
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
        {/* More info */}
        <Skeleton className="h-4 w-16 mx-auto" />
      </div>
    </div>
  )
}

export function RecommendationsGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function RecommendationsMobileSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardHorizontalSkeleton key={i} />
      ))}
    </div>
  )
}

export function OnboardingFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="py-4 border-b border-border/50">
        <div className="flex justify-between mb-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-4 w-32 mt-3" />
      </div>

      {/* Movie cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-2 border-border rounded-2xl p-4 space-y-4">
          <div className="flex gap-4">
            {/* Poster placeholder */}
            <Skeleton className="w-24 aspect-[2/3] rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          {/* Rating buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-14 rounded-xl" />
            ))}
          </div>
          {/* Textarea */}
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}

      {/* Submit button */}
      <Skeleton className="h-12 w-40 rounded-md mx-auto" />
    </div>
  )
}

export function TabsSkeleton() {
  return (
    <div className="flex gap-1 border-b pb-1 mb-8 overflow-x-auto">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-24 rounded-md flex-shrink-0" />
      ))}
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </header>
  )
}

export function PlatformManagerSkeleton() {
  return (
    <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-14 rounded-lg" />
          <Skeleton className="h-6 w-18 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderSkeleton />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48 mb-8" />
        <PlatformManagerSkeleton />
        <TabsSkeleton />
        <RecommendationsGridSkeleton count={10} />
      </div>
    </div>
  )
}
