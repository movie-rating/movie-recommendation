'use client'
import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { SuccessToast } from './success-toast'
import { saveFeedbackAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function NotInterestedModal({
  movieTitle,
  recommendationId,
  onClose
}: {
  movieTitle: string
  recommendationId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    const result = await saveFeedbackAction(
      recommendationId,
      'not_interested',
      undefined,
      reason || undefined
    )
    setLoading(false)

    if (result.success) {
      setShowSuccessToast(true)
      router.refresh()
      setTimeout(handleClose, 300)
    } else {
      setError(result.error || 'Failed to save')
    }
  }

  // Handle escape key
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false)
        setTimeout(onClose, 200)
      }
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-background rounded-2xl w-full max-w-md shadow-xl transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg font-semibold line-clamp-1 pr-4">Not Interested</h2>
          <button
            onClick={handleClose}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            We won&apos;t show <span className="font-medium text-foreground">{movieTitle}</span> in your recommendations anymore.
          </p>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Why not interested? <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Not a fan of this genre, already seen it, etc."
              className="w-full mt-2 px-4 py-3 border border-input rounded-xl bg-background min-h-[100px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This helps us improve future recommendations
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl border border-destructive/20">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Confirm'}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <SuccessToast
        message="Feedback saved"
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  )
}
