'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { StreamingPlatformSelector } from './streaming-platform-selector'

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
  const maxChars = 500

  if (!isOpen) return null

  const handleSubmit = async () => {
    await onSubmit(guidance.trim())
    setGuidance('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card p-6 rounded-lg border max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">Guide Your Next Recommendations</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Break out of pigeonholed patterns. Tell us what direction you want to explore - we'll blend it with your taste DNA.
        </p>
        
        {/* Platform display/edit section */}
        {currentPlatforms.length > 0 && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Filtering by platforms</span>
              <button
                onClick={() => setShowPlatformEdit(!showPlatformEdit)}
                className="text-xs text-primary hover:underline"
                type="button"
              >
                {showPlatformEdit ? 'Hide' : 'Edit'}
              </button>
            </div>
            {!showPlatformEdit ? (
              <div className="flex gap-1.5 flex-wrap">
                {currentPlatforms.map(p => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Platform changes apply on the main page via "Edit Platforms"
              </div>
            )}
          </div>
        )}
        
        <textarea
          className="w-full min-h-32 p-3 rounded-md border bg-background text-sm"
          placeholder="Examples:&#10;• I want more international films&#10;• Looking for something lighter and funnier&#10;• Need intense thrillers right now&#10;• More shows with strong ensemble casts&#10;&#10;Or leave blank for standard regeneration"
          value={guidance}
          onChange={e => setGuidance(e.target.value.slice(0, maxChars))}
          disabled={loading}
        />
        
        <div className="flex justify-between items-center mt-2 mb-4">
          <span className="text-xs text-muted-foreground">
            {guidance.length}/{maxChars} characters
          </span>
          {guidance && (
            <button
              onClick={() => setGuidance('')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Generating...' : guidance ? 'Generate with Guidance' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  )
}



