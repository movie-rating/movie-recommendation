export const THRESHOLDS = {
  MIN_MOVIES_ONBOARDING: 3,
  MAX_MOVIES_ONBOARDING: 8,
  MIN_RATINGS_FOR_MORE: 3,
  MIN_GENES_FOR_REGENERATE: 3,
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

export const GENE_CONSOLIDATION = {
  SIMILARITY_THRESHOLD: 0.85,      // 85%+ similar = merge
  MAX_GENES_PER_USER: 50,          // Soft limit
  MIN_ACCURACY_THRESHOLD: 0.4,    // Below 40% accuracy = noisy
  MIN_SAMPLE_SIZE_FOR_PRUNING: 5, // Need 5+ samples to judge accuracy
  MIN_GENES_PER_MOVIE: 1,          // Minimum genes to extract
  MAX_GENES_PER_MOVIE: 6           // Maximum genes to extract
} as const

export const GENE_MULTIPLIER = {
  BASE: 1.0,                       // Base multiplier for single-source genes
  INCREMENT_PER_SOURCE: 0.15,      // Additional weight per source (15%)
  MAX_MULTIPLIER: 2.0,             // Cap at 2.0x to avoid overweighting
  STRONG_VALIDATION_THRESHOLD: 3, // 3+ sources = "strongly validated" gene
} as const

export const RECOMMENDATION_GENERATION = {
  DUPLICATE_RETRY_THRESHOLD: 0.4,  // Retry if >40% duplicates
  MAX_RETRIES: 1,                   // Max retry attempts
  EXCLUSION_LIST_NORMAL: 50,        // Titles shown in normal mode
  EXCLUSION_LIST_STRICT: 100,       // Titles shown in strict mode
} as const

