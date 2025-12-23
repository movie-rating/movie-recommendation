import type { TMDBMovieDetails, TMDBTVDetails } from './types'

/**
 * Utility functions for formatting movie/TV show display information
 */

export function getRuntime(movieDetails: TMDBMovieDetails | TMDBTVDetails | null, isTV: boolean): string | null {
  if (!movieDetails) return null
  
  if (isTV) {
    const tvDetails = movieDetails as TMDBTVDetails
    return tvDetails.episode_run_time?.[0] ? `${tvDetails.episode_run_time[0]}min/ep` : null
  } else {
    const movieDetails_ = movieDetails as TMDBMovieDetails
    if (!movieDetails_.runtime) return null
    const hours = Math.floor(movieDetails_.runtime / 60)
    const minutes = movieDetails_.runtime % 60
    return `${hours}h ${minutes}m`
  }
}

export function getReleaseYear(movieDetails: TMDBMovieDetails | TMDBTVDetails | null, isTV: boolean): string | null {
  if (!movieDetails) return null
  
  if (isTV) {
    const tvDetails = movieDetails as TMDBTVDetails
    return tvDetails.first_air_date?.split('-')[0] || null
  } else {
    const movieDetails_ = movieDetails as TMDBMovieDetails
    return movieDetails_.release_date?.split('-')[0] || null
  }
}

export function getRating(movieDetails: TMDBMovieDetails | TMDBTVDetails | null): string | null {
  if (!movieDetails) return null
  return movieDetails.vote_average?.toFixed(1) || null
}

export function getCreatorOrDirector(movieDetails: TMDBMovieDetails | TMDBTVDetails | null, isTV: boolean): string | null {
  if (!movieDetails) return null
  
  if (isTV) {
    const tvDetails = movieDetails as TMDBTVDetails
    return tvDetails.created_by?.[0]?.name || null
  } else {
    const movieDetails_ = movieDetails as TMDBMovieDetails
    return movieDetails_.credits?.crew?.find((c: any) => c.job === 'Director')?.name || null
  }
}

export function getCast(movieDetails: TMDBMovieDetails | TMDBTVDetails | null): string | null {
  if (!movieDetails?.credits?.cast) return null
  return movieDetails.credits.cast.slice(0, 3).map(c => c.name).join(', ')
}

export function getSeasonInfo(movieDetails: TMDBMovieDetails | TMDBTVDetails | null, isTV: boolean): string | null {
  if (!isTV || !movieDetails) return null
  
  const tvDetails = movieDetails as TMDBTVDetails
  if (!tvDetails.number_of_seasons) return null
  
  return `${tvDetails.number_of_seasons} season${tvDetails.number_of_seasons > 1 ? 's' : ''}`
}
