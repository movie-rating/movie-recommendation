'use client'
import { useState, useEffect } from 'react'
import { StreamingPlatformSelector, PLATFORMS } from './streaming-platform-selector'
import { Button } from './ui/button'
import { updateUserPlatformsAction } from '@/app/recommendations/actions'
import { useRouter } from 'next/navigation'

interface PlatformManagerProps {
  initialPlatforms: string[]
}

export function PlatformManager({ initialPlatforms }: PlatformManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [platforms, setPlatforms] = useState(initialPlatforms)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    
    const result = await updateUserPlatformsAction(platforms)
    
    if (result.success) {
      setIsEditing(false)
      router.refresh()
    } else {
      setError(result.error || 'Failed to save platforms')
    }
    
    setSaving(false)
  }

  const handleCancel = () => {
    setPlatforms(initialPlatforms)
    setIsEditing(false)
    setError(null)
  }

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isEditing) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlatforms(initialPlatforms)
        setIsEditing(false)
        setError(null)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isEditing, initialPlatforms])

  // Show "Add Platforms" button if none exist
  if (initialPlatforms.length === 0 && !isEditing) {
    return (
      <div className="mb-6 p-4 bg-muted/10 rounded-lg border border-dashed">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            No streaming platforms selected. Add platforms to get more targeted recommendations.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Add Platforms
          </Button>
        </div>
      </div>
    )
  }

  if (!isEditing) {
    return (
      <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Showing content on:</span>
            {initialPlatforms.map(p => {
              const platform = PLATFORMS.find(plat => plat.name === p)
              const displayName = platform?.displayName || p
              const badgeColors = platform?.badgeColors || 'bg-primary/10 text-foreground'
              return (
                <span
                  key={p}
                  className={`${badgeColors} text-xs px-2 py-0.5 rounded font-semibold shadow-sm`}
                  title={displayName}
                >
                  {displayName}
                </span>
              )
            })}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit Platforms
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleCancel}
    >
      <div 
        className="bg-card p-6 rounded-lg border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">Edit Streaming Platforms</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
            {error}
          </div>
        )}
        
        <StreamingPlatformSelector
          selected={platforms}
          onChange={setPlatforms}
          compact={false}
        />
        
        {platforms.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            No platforms selected = show all content
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

