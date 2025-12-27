'use client'

import { memo } from 'react'
import { RatingModal } from '@/components/rating-modal'
import { NotInterestedModal } from '@/components/not-interested-modal'
import { SuccessToast } from '@/components/success-toast'

interface ModalState {
  rating: boolean
  notInterested: boolean
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

interface MovieModalsProps {
  title: string
  recommendationId: string
  modals: ModalState
  toast: Toast | null
  onCloseRating: () => void
  onCloseNotInterested: () => void
  onClearToast: () => void
}

export const MovieModals = memo(function MovieModals({
  title,
  recommendationId,
  modals,
  toast,
  onCloseRating,
  onCloseNotInterested,
  onClearToast
}: MovieModalsProps) {
  return (
    <>
      {modals.rating && (
        <RatingModal
          movieTitle={title}
          recommendationId={recommendationId}
          onClose={onCloseRating}
        />
      )}

      {modals.notInterested && (
        <NotInterestedModal
          movieTitle={title}
          recommendationId={recommendationId}
          onClose={onCloseNotInterested}
        />
      )}

      <SuccessToast
        message={toast?.message || ''}
        show={!!toast}
        onClose={onClearToast}
        variant={toast?.type}
      />
    </>
  )
})
