'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveFeedbackAction, removeFeedbackAction } from '@/app/recommendations/actions'
import { RATING_MAP } from '@/lib/constants'
import type { MovieFeedback, MediaType, TMDBMovieDetails, TMDBTVDetails } from '@/lib/types'
import {
  getRuntime,
  getReleaseYear,
  getRating,
  getCreatorOrDirector,
  getCast,
  getSeasonInfo
} from '@/lib/movie-display-utils'

export interface MovieCardData {
  id: string
  title: string
  posterUrl: string
  reasoning: string
  matchExplanation?: string
  feedback?: MovieFeedback | null
  experimental?: boolean
  movieDetails?: TMDBMovieDetails | TMDBTVDetails | null
  mediaType?: MediaType
  matchConfidence?: number
  isUserMovie?: boolean
  availableOn?: string | null
}

type ToastType = 'success' | 'error'

interface Toast {
  message: string
  type: ToastType
}

interface ModalState {
  rating: boolean
  notInterested: boolean
}

export function useMovieCard(props: MovieCardData) {
  const [modals, setModals] = useState<ModalState>({ rating: false, notInterested: false })
  const [expanded, setExpanded] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    id,
    feedback,
    movieDetails,
    mediaType = 'movie'
  } = props

  const isTV = mediaType === 'tv'

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }, [])

  const clearToast = useCallback(() => {
    setToast(null)
  }, [])

  const openModal = useCallback((modal: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modal]: true }))
  }, [])

  const closeModal = useCallback((modal: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modal]: false }))
  }, [])

  const handleAddToWatchlist = useCallback(async () => {
    setIsLoading(true)
    const result = await saveFeedbackAction(id, 'watchlist')
    setIsLoading(false)
    if (result.success) {
      showToast('Added to watchlist')
      router.refresh()
    } else {
      showToast(result.error || 'Failed to add to watchlist', 'error')
    }
  }, [id, router, showToast])

  const handleRemoveFromWatchlist = useCallback(async () => {
    setIsLoading(true)
    const result = await removeFeedbackAction(id)
    setIsLoading(false)
    if (result.success) {
      showToast('Removed from watchlist')
      router.refresh()
    } else {
      showToast(result.error || 'Failed to remove from watchlist', 'error')
    }
  }, [id, router, showToast])

  const getRatingDisplay = useCallback(() => {
    if (!feedback?.rating) return null
    return RATING_MAP[feedback.rating as keyof typeof RATING_MAP] || feedback.rating
  }, [feedback?.rating])

  // Derived movie metadata
  const metadata = {
    isTV,
    runtime: getRuntime(movieDetails || null, isTV),
    year: getReleaseYear(movieDetails || null, isTV),
    rating: getRating(movieDetails || null),
    creator: getCreatorOrDirector(movieDetails || null, isTV),
    cast: getCast(movieDetails || null),
    seasons: getSeasonInfo(movieDetails || null, isTV),
    overview: movieDetails?.overview
  }

  return {
    // Grouped modal state
    modals,
    openModal,
    closeModal,

    // Expansion state
    expanded,
    setExpanded,

    // Toast notifications (now includes errors)
    toast,
    showToast,
    clearToast,

    // Loading state
    isLoading,

    // Handlers
    handleAddToWatchlist,
    handleRemoveFromWatchlist,
    getRatingDisplay,

    // Derived data
    metadata
  }
}
