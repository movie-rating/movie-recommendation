import { Header } from '@/components/header'
import { OnboardingFormSkeleton } from '@/components/skeletons'

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="text-center mb-10 md:mb-16 space-y-4">
          <div className="h-12 md:h-14 lg:h-16 bg-muted rounded-lg w-3/4 mx-auto animate-pulse" />
          <div className="h-6 md:h-8 bg-muted rounded w-2/3 mx-auto animate-pulse" />
        </div>

        <OnboardingFormSkeleton />
      </div>
    </div>
  )
}
