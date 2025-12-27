# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered movie recommendation app using Next.js 15 (App Router), Supabase, Google Gemini API, and TMDB API.

## Development Commands

All commands run from `movie-prototype/`:

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

## Architecture

### Directory Structure
- `movie-prototype/` - Next.js application root
- `supabase/migrations/` - Database migration SQL files

### Data Flow
1. User rates movies during onboarding → stored in `user_movies` table
2. `generateNewRecommendations()` in `lib/recommendations-service.ts` orchestrates the pipeline:
   - Fetches user movies, feedback, existing recommendations, and streaming platforms
   - Calls Gemini API via `generateRecommendationsFromMovies()` for 10 safe + 5 experimental picks
   - Enriches with TMDB data (posters, metadata)
   - Filters duplicates and stores in `recommendations` table with batch_id
3. User provides feedback → stored in `movie_feedback` table, used in future generations

### Key Files
- `lib/recommendations-service.ts` - Core recommendation generation logic (server action)
- `lib/gemini.ts` - Gemini API prompts and response parsing
- `lib/tmdb.ts` - TMDB API integration for movie metadata
- `lib/db-helpers.ts` - Database query functions
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/constants.ts` - Thresholds and configuration values
- `middleware.ts` - Supabase auth session management

### Authentication & Sessions
- Supabase Auth with email/password
- Cookie-based session tracking (7-day expiry)
- Anonymous users supported for onboarding/recommendations
- Protected routes under `/protected/*`

### Types
Defined in `lib/types.ts`:
- `Rating`: 'loved' | 'liked' | 'meh' | 'hated'
- `FeedbackStatus`: 'to_watch' | 'watched' | 'not_interested' | 'watchlist'
- `MediaType`: 'movie' | 'tv'

### Database Tables
- `sessions` - User sessions
- `user_movies` - User's rated movies from onboarding
- `recommendations` - AI-generated suggestions with batch_id grouping
- `movie_feedback` - User feedback on recommendations
- `user_streaming_platforms` - User's available streaming services

## Environment Variables

Required in `movie-prototype/.env.local`:
```
GEMINI_API_KEY
TMDB_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Key Patterns

### Server Actions
Files using `'use server'` directive contain server-side functions callable from client components. Main one is `lib/recommendations-service.ts`.

### Recommendation Thresholds
From `lib/constants.ts`:
- MIN_MOVIES_ONBOARDING: 3
- MAX_MOVIES_ONBOARDING: 8
- SAFE_RECOMMENDATIONS: 10
- EXPERIMENTAL_RECOMMENDATIONS: 5

### Gemini Model
Uses `gemini-3-flash-preview` model for all AI operations.
