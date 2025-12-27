import { MovieInputForm } from '@/components/movie-input-form'
import { Header } from '@/components/header'
import { Suspense } from 'react'
import { Metadata } from 'next'
import { THRESHOLDS } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Get Personalized Recommendations | AI-Powered',
  description: 'Tell us your favorite movies and TV shows, and get personalized AI-powered recommendations based on your unique taste.',
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            What do you like to watch?
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Rate {THRESHOLDS.MIN_MOVIES_ONBOARDING}-{THRESHOLDS.MAX_MOVIES_ONBOARDING} movies or TV shows to get {THRESHOLDS.TOTAL_RECOMMENDATIONS} personalized recommendations
          </p>
        </div>
        
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }>
          <MovieInputForm />
        </Suspense>
      </div>
    </div>
  )
}

