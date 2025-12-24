'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { SuccessToast } from './success-toast'
import { saveFeedbackAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

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
      setTimeout(onClose, 300) // Small delay to show toast
    } else {
      setError(result.error || 'Failed to save')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Not Interested: {movieTitle}</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Why not interested? (Optional)</Label>
            <textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Not a fan of this genre, too similar to other things I've seen, etc."
              className="w-full mt-2 px-3 py-2 border rounded-md bg-background min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This helps us avoid similar recommendations
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Confirm'}
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
        message="Feedback saved"
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  )
}

