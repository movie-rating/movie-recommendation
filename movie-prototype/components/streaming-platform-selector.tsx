'use client'

// Popular US streaming platforms with logos
export const PLATFORMS = [
  { 
    name: 'Netflix',
    displayName: 'Netflix',
    logo: <span className="font-bold text-lg tracking-tight">NETFLIX</span>,
    color: 'text-[#E50914]',
    badgeColors: 'bg-[#E50914] text-white'
  },
  { 
    name: 'Amazon Prime Video',
    displayName: 'Prime Video',
    logo: <span className="font-bold text-base">Prime Video</span>,
    color: 'text-[#00A8E1]',
    badgeColors: 'bg-[#00A8E1] text-white'
  },
  { 
    name: 'Disney+',
    displayName: 'Disney+',
    logo: <span className="font-bold text-lg">Disney+</span>,
    color: 'text-[#113CCF]',
    badgeColors: 'bg-[#113CCF] text-white'
  },
  { 
    name: 'HBO Max',
    displayName: 'HBO Max',
    logo: <span className="font-bold text-lg tracking-wide">HBO MAX</span>,
    color: 'text-[#A065FA]',
    badgeColors: 'bg-[#A065FA] text-white'
  },
  { 
    name: 'Hulu',
    displayName: 'Hulu',
    logo: <span className="font-bold text-xl">hulu</span>,
    color: 'text-[#1CE783]',
    badgeColors: 'bg-[#1CE783] text-white'
  },
  { 
    name: 'Apple TV+',
    displayName: 'Apple TV+',
    logo: (
      <span className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        <span className="font-semibold text-base">TV+</span>
      </span>
    ),
    color: 'text-foreground',
    badgeColors: 'bg-black text-white'
  },
  { 
    name: 'Paramount+',
    displayName: 'Paramount+',
    logo: (
      <span className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm6.3 12.6L12 18.3l-6.3-3.7V9.4L12 5.7l6.3 3.7v5.2z"/>
        </svg>
        <span className="font-bold text-base">Paramount+</span>
      </span>
    ),
    color: 'text-[#0064FF]',
    badgeColors: 'bg-[#0064FF] text-white'
  },
  { 
    name: 'Peacock',
    displayName: 'Peacock',
    logo: (
      <span className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
        </svg>
        <span className="font-bold text-base">Peacock</span>
      </span>
    ),
    color: 'text-foreground',
    badgeColors: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
  }
]

interface StreamingPlatformSelectorProps {
  selected: string[]
  onChange: (platforms: string[]) => void
  compact?: boolean
  showCount?: boolean
}

export function StreamingPlatformSelector({ 
  selected, 
  onChange,
  compact = false,
  showCount = true
}: StreamingPlatformSelectorProps) {
  const togglePlatform = (platformName: string) => {
    if (selected.includes(platformName)) {
      onChange(selected.filter(p => p !== platformName))
    } else {
      onChange([...selected, platformName])
    }
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-sm font-medium mb-2">Filter by streaming platforms (optional)</h3>
          <p className="text-xs text-muted-foreground">
            Select your platforms to get more targeted recommendations
          </p>
        </div>
      )}
      
      <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
        {PLATFORMS.map(platform => {
          const isSelected = selected.includes(platform.name)
          return (
            <button
              key={platform.name}
              type="button"
              onClick={() => togglePlatform(platform.name)}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left group ${
                isSelected
                  ? 'border-2 border-primary bg-primary/5 shadow-sm scale-[1.02]'
                  : 'border-2 border-muted hover:border-primary/40 hover:bg-accent hover:scale-[1.02]'
              }`}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${platform.name}`}
              aria-pressed={isSelected}
            >
              <div className="flex-shrink-0">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-background border-input'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`transition-colors ${isSelected ? platform.color : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {platform.logo}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      
      {showCount && selected.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {selected.length} platform{selected.length === 1 ? '' : 's'} selected
        </p>
      )}
    </div>
  )
}

