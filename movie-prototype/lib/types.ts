export type MediaType = 'movie' | 'tv'

export type Rating = 'loved' | 'liked' | 'meh' | 'hated'

export type FeedbackStatus = 'to_watch' | 'watched' | 'not_interested'

export interface TasteGene {
  id: string
  gene_name: string
  strength: number
  is_negative: boolean
  is_dealbreaker: boolean
  description: string
  confidence_score?: number
  times_validated?: number
  source_movie_title?: string
  source_rating?: string
  extracted_at?: string
}

export interface Recommendation {
  id: string
  movie_title: string
  media_type: MediaType
  tmdb_movie_id?: number | null
  tmdb_tv_id?: number | null
  reasoning: string
  poster_path: string | null
  is_experimental: boolean
  number_of_seasons?: number | null
  number_of_episodes?: number | null
  created_at?: string
}

export interface MovieFeedback {
  status: FeedbackStatus
  rating?: Rating
  reason?: string | null
}

export interface UserMovie {
  id: string
  movie_title: string
  sentiment: Rating
  reason: string
  media_type?: MediaType
  session_id: string
  user_id?: string | null
}

export interface TasteProfile {
  id: string
  session_id: string
  user_id?: string | null
  profile_summary: string
  total_genes: number
  confidence_level: 'emerging' | 'developing' | 'established'
  updated_at: string
  created_at: string
}

