'use client'
import { useEffect, useState } from 'react'

/**
 * Custom hook to detect media query matches
 * @param query - CSS media query string (e.g., '(max-width: 640px)')
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query])

  // Return false on server-side and initial client render to prevent hydration mismatch
  // After mount, return actual matches value
  return mounted ? matches : false
}

