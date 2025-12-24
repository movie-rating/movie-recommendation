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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gradient">
            What do you like to watch?
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Rate {THRESHOLDS.MIN_MOVIES_ONBOARDING}-{THRESHOLDS.MAX_MOVIES_ONBOARDING} movies or TV shows, and we'll recommend {THRESHOLDS.TOTAL_RECOMMENDATIONS} perfect picks for you
          </p>
        </div>
        
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <MovieInputForm />
        </Suspense>
      </div>
    </div>
  )
}

