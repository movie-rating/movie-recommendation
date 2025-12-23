export const THRESHOLDS = {
  MIN_MOVIES_ONBOARDING: 3,
  MAX_MOVIES_ONBOARDING: 8,
  MIN_RATINGS_FOR_MORE: 3,
  SAFE_RECOMMENDATIONS: 10,
  EXPERIMENTAL_RECOMMENDATIONS: 5,
  TOTAL_RECOMMENDATIONS: 15,
} as const

export const CONFIDENCE_LEVELS = {
  EMERGING: 5,
  DEVELOPING: 15,
} as const

export const GENE_STRENGTH = {
  MIN: 1,
  MAX: 5,
  THRESHOLD_STRONG: 4,
  THRESHOLD_NEGATIVE: 3,
} as const

export const RATING_MAP: Record<string, string> = {
  loved: '😍 Love',
  liked: '👍 Like',
  meh: '😐 Meh',
  hated: '😠 Hate'
}

export const RATING_MAP_UPPER: Record<string, string> = {
  loved: 'LOVED',
  liked: 'LIKED',
  meh: 'MEH',
  hated: 'HATED'
}

