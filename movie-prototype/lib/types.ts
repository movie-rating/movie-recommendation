export type MediaType = 'movie' | 'tv'

export type Rating = 'loved' | 'liked' | 'meh' | 'hated'

export type FeedbackStatus = 'to_watch' | 'watched' | 'not_interested' | 'watchlist'

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
  source_count?: number
  source_multiplier?: number
  sources?: GeneSource[]
}

export interface GeneSource {
  id: string
  gene_id: string
  session_id: string
  source_movie_title: string
  source_rating: string
  contributed_at: string
}

export interface Recommendation {
  id: string
  movie_title: string
  media_type: MediaType
  tmdb_movie_id?: number | null
  tmdb_tv_id?: number | null
  reasoning: string
  match_explanation?: string
  poster_path: string | null
  is_experimental: boolean
  match_confidence: number
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

// Composite types for components
export interface RecommendationWithFeedback extends Recommendation {
  posterUrl: string
  feedback: MovieFeedback | null
  movieDetails?: TMDBMovieDetails | TMDBTVDetails | null
}

// TMDB API response types
export interface TMDBMovieDetails {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  runtime: number
  vote_average: number
  vote_count: number
  genres: Array<{ id: number; name: string }>
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>
    crew: Array<{ id: number; name: string; job: string; department: string }>
  }
}

export interface TMDBTVDetails {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  episode_run_time: number[]
  number_of_seasons: number
  number_of_episodes: number
  vote_average: number
  vote_count: number
  genres: Array<{ id: number; name: string }>
  created_by: Array<{ id: number; name: string; profile_path: string | null }>
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>
    crew: Array<{ id: number; name: string; job: string; department: string }>
  }
}



