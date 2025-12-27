'use client'
import { PLATFORMS } from './streaming-platform-selector'

interface PlatformBadgeProps {
  availableOn: string | null | undefined
  size?: 'sm' | 'md'
  className?: string
}

// Parse comma-separated platform strings
function parsePlatforms(platformString: string | null | undefined): string[] {
  if (!platformString) return []
  return platformString.split(',').map(p => p.trim()).filter(Boolean)
}

// Get platform metadata from PLATFORMS constant
function getPlatformMetadata(platformName: string) {
  const platform = PLATFORMS.find(p => p.name === platformName)
  if (platform) {
    return {
      displayName: platform.displayName,
      badgeColors: platform.badgeColors
    }
  }
  // Fallback for unknown platforms
  return {
    displayName: platformName,
    badgeColors: 'bg-primary text-primary-foreground'
  }
}

export function PlatformBadge({ availableOn, size = 'sm', className = '' }: PlatformBadgeProps) {
  const platforms = parsePlatforms(availableOn)
  
  if (platforms.length === 0) return null
  
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'
  
  return (
    <div className={`flex flex-wrap gap-1 justify-end ${className}`}>
      {platforms.map((platform) => {
        const metadata = getPlatformMetadata(platform)
        return (
          <span
            key={platform}
            className={`${metadata.badgeColors} ${textSize} ${padding} rounded font-semibold shadow-sm`}
            title={`Available on ${metadata.displayName}`}
          >
            {metadata.displayName}
          </span>
        )
      })}
    </div>
  )
}

