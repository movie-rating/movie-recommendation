'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { SuccessToast } from './success-toast'
import { saveFeedbackAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'
import { RATING_MAP } from '@/lib/constants'

const RATINGS = [
  { value: 'loved', label: RATING_MAP.loved, color: 'bg-green-500' },
  { value: 'liked', label: RATING_MAP.liked, color: 'bg-blue-500' },
  { value: 'meh', label: RATING_MAP.meh, color: 'bg-orange-500' },
  { value: 'hated', label: RATING_MAP.hated, color: 'bg-red-500' },
]

export function RatingModal({ 
  movieTitle, 
  recommendationId, 
  onClose 
}: {
  movieTitle: string
  recommendationId: string
  onClose: () => void
}) {
  const [rating, setRating] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!rating) return
    setLoading(true)
    setError(null)
    
    const result = await saveFeedbackAction(recommendationId, 'watched', rating, reason)
    setLoading(false)
    
    if (result.success) {
      setShowSuccessToast(true)
      router.refresh()
      setTimeout(onClose, 300) // Small delay to show toast
    } else {
      setError(result.error || 'Failed to save rating')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background rounded-lg w-full max-w-md mx-4 p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Rate: {movieTitle}</h2>
        
        <div className="space-y-4">
          <div>
            <Label>How did you feel about it?</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {RATINGS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRating(r.value)}
                  className={`p-3 min-h-[44px] rounded-lg border-2 text-left transition ${
                    rating === r.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{r.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Why? (Optional but helps improve recommendations)</Label>
            <textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="What did you think about it?"
              className="w-full mt-2 px-3 py-2 border rounded-md bg-background min-h-[80px]"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleSubmit} 
              disabled={!rating || loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Rating'}
            </Button>
            <Button 
              onClick={onClose} 
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
      
      <SuccessToast 
        message="Rating saved!"
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  )
}

