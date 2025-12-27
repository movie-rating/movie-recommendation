'use client'
import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { PLATFORMS } from './streaming-platform-selector'
import { X } from 'lucide-react'

export function RegenerateModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  currentPlatforms = []
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (guidance: string) => Promise<void>
  loading: boolean
  currentPlatforms?: string[]
}) {
  const [guidance, setGuidance] = useState('')
  const [showPlatformEdit, setShowPlatformEdit] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const maxChars = 500

  // Handle visibility animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setIsVisible(false)
        setTimeout(onClose, 200)
      }
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const handleClose = () => {
    if (loading) return
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleSubmit = async () => {
    await onSubmit(guidance.trim())
    setGuidance('')
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-background rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h3 className="text-lg font-semibold">New Recommendations</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Tell us what you&apos;re in the mood for, or leave blank for a fresh batch based on your taste.
          </p>

          {/* Platform display */}
          {currentPlatforms.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Platforms</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlatformEdit(!showPlatformEdit)}
                  type="button"
                  className="h-8 text-xs"
                >
                  {showPlatformEdit ? 'Done' : 'Edit'}
                </Button>
              </div>
              {!showPlatformEdit ? (
                <div className="flex gap-2 flex-wrap">
                  {currentPlatforms.map(p => {
                    const platform = PLATFORMS.find(plat => plat.name === p)
                    const displayName = platform?.displayName || p
                    return (
                      <span
                        key={p}
                        className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-lg font-medium"
                      >
                        {displayName}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Edit platforms on the main page using &quot;Edit Platforms&quot;
                </p>
              )}
            </div>
          )}

          <div>
            <textarea
              className="w-full min-h-[140px] p-4 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="Examples:
• More international films
• Something lighter and funnier
• Intense thrillers
• Shows with strong ensemble casts

Or leave blank for standard recommendations"
              value={guidance}
              onChange={e => setGuidance(e.target.value.slice(0, maxChars))}
              disabled={loading}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                {guidance.length}/{maxChars}
              </span>
              {guidance && (
                <button
                  onClick={() => setGuidance('')}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Generating...' : guidance ? 'Generate with Guidance' : 'Generate Fresh Picks'}
            </Button>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
