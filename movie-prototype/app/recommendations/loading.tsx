import { Header } from '@/components/header'
import {
  HeaderSkeleton,
  TabsSkeleton,
  RecommendationsGridSkeleton,
  RecommendationsMobileSkeleton,
  PlatformManagerSkeleton,
  Skeleton
} from '@/components/skeletons'

export default function RecommendationsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-12">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-10 sm:h-12 w-64" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-80 hidden sm:block" />
          </div>
          <Skeleton className="h-11 w-40" />
        </div>

        {/* Platform manager */}
        <PlatformManagerSkeleton />

        {/* Tabs */}
        <TabsSkeleton />

        {/* Section title */}
        <Skeleton className="h-8 w-56 mb-4" />

        {/* Grid - desktop */}
        <div className="hidden sm:block">
          <RecommendationsGridSkeleton count={10} />
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden">
          <RecommendationsMobileSkeleton count={5} />
        </div>

        {/* Experimental section */}
        <div className="mt-12 p-4 sm:p-6 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-4 w-72 mb-6" />

          {/* Grid - desktop */}
          <div className="hidden sm:block">
            <RecommendationsGridSkeleton count={5} />
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden">
            <RecommendationsMobileSkeleton count={3} />
          </div>
        </div>

        {/* Load more button */}
        <div className="mt-8 sm:mt-12 flex justify-center">
          <Skeleton className="h-11 w-64 rounded-md" />
        </div>
      </div>
    </div>
  )
}
