import { GoogleGenerativeAI } from '@google/generative-ai'
import { RATING_MAP_UPPER, THRESHOLDS } from './constants'
import { filterDuplicateTitles } from './utils'
import {
  AIRecommendation,
  GeminiRecommendationsResponseSchema,
  SimpleRecommendationsArraySchema,
  RescoreResponseSchema,
  parseGeminiResponse
} from './schemas'
import { logError } from './errors'
import './env'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export type { AIRecommendation }

export async function generateRecommendations(
  movies: Array<{ title: string; sentiment: string; reason: string }>
): Promise<AIRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  const prompt = `You are an entertainment expert. Based on these ratings, suggest exactly ${THRESHOLDS.TOTAL_RECOMMENDATIONS} movies or TV shows they would enjoy.

User's ratings:
${movies.map(m => {
  return `${RATING_MAP_UPPER[m.sentiment as keyof typeof RATING_MAP_UPPER] || m.sentiment.toUpperCase()}: "${m.title}" - ${m.reason}`
}).join('\n')}

Respond with ONLY valid JSON, no markdown or code blocks:
[{"title": "Movie Name", "year": 2020, "reasoning": "Why they'd enjoy it (max 100 chars)", "ai_confidence": 75}]

For ai_confidence (0-100 scale):
- Use 70-85 for recommendations based on their explicit ratings
- Higher scores for stronger alignment with their stated preferences`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const parsed = parseGeminiResponse(text, SimpleRecommendationsArraySchema, 'generateRecommendations')

  if (!parsed.success) {
    logError('Gemini', parsed.error, { code: 'PARSE_ERROR', meta: { rawText: parsed.rawText } })
    return []
  }

  return parsed.data
}

export async function generateRecommendationsFromMovies(
  userMovies: Array<{ movie_title: string; sentiment: string; reason: string }>,
  existingMovieTitles: string[],
  userGuidance?: string,
  streamingPlatforms?: string[]
): Promise<{ safe: AIRecommendation[]; experimental: AIRecommendation[] }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  // Separate loved/liked from hated/meh
  const lovedMovies = userMovies.filter(m =>
    m.sentiment === 'loved' || m.sentiment === 'liked'
  )
  const dislikedMovies = userMovies.filter(m =>
    m.sentiment === 'hated' || m.sentiment === 'meh'
  )

  // Build exclusion list section
  const exclusionSection = existingMovieTitles.length > 0
    ? `\n\nDO NOT RECOMMEND - Already seen (${existingMovieTitles.length} titles):
${existingMovieTitles.map(t => `- ${t}`).join('\n')}`
    : ''

  // Build user guidance section
  const guidanceSection = userGuidance
    ? `\n\nUSER'S CURRENT REQUEST:\n"${userGuidance}"\nBlend this with their taste profile.`
    : ''

  // Build platform constraint section
  const platformSection = streamingPlatforms && streamingPlatforms.length > 0
    ? `\n\nSTREAMING PLATFORM CONSTRAINT:
The user has access to: ${streamingPlatforms.join(', ')}

CRITICAL: Only recommend movies and TV shows that are currently available on these platforms.
Do NOT recommend content that requires other streaming services or is not on these platforms.`
    : ''

  const prompt = `You are an entertainment expert. Generate movie and TV show recommendations.

USER'S LOVED MOVIES:
${lovedMovies.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}

${dislikedMovies.length > 0 ? `USER'S DISLIKED MOVIES:\n${dislikedMovies.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}` : ''}
${exclusionSection}
${platformSection}
${guidanceSection}

Generate TWO types of recommendations:

1. SAFE RECOMMENDATIONS (10 movies/shows):
   - Strong alignment with what they explicitly loved
   - High confidence matches
   - Similar themes, styles, or qualities to their favorites
   - Confidence scores: 75-95

2. EXPERIMENTAL RECOMMENDATIONS (5 movies/shows):
   - Adjacent genres or styles they might enjoy
   - Explore new territory while respecting their dislikes
   - "Safe experiments" - different but likely to succeed
   - Confidence scores: 60-80

CRITICAL REQUIREMENTS:
- Avoid all titles in the exclusion list
- Mix of movies and TV shows in both categories
- Diverse genres, decades, countries
- Each recommendation needs: title, year, reasoning (max 80 chars), match_explanation (max 120 chars), ai_confidence (0-100), available_on (comma-separated list of ALL platforms from user's list where this content is available, if platforms provided)

Respond with ONLY valid JSON:
{
  "safe": [
    {"title": "Movie Name", "year": 2020, "reasoning": "Brief pitch", "match_explanation": "Why this matches", "ai_confidence": 85, "available_on": "Netflix, Hulu"}
  ],
  "experimental": [
    {"title": "Movie Name", "year": 2020, "reasoning": "Brief pitch", "match_explanation": "Why this expands their taste", "ai_confidence": 70, "available_on": "Disney+"}
  ]
}`

  // Log prompt metadata before API call
  console.log(`[Gemini] Prompt: ${prompt.length} chars, Exclusions: ${existingMovieTitles.length} titles, Loved: ${lovedMovies.length}, Disliked: ${dislikedMovies.length}`)

  // Time the actual API call
  const apiStartTime = Date.now()
  const result = await model.generateContent(prompt)
  const apiDuration = Date.now() - apiStartTime

  const text = result.response.text()
  console.log(`[Gemini] API call: ${apiDuration}ms, Response: ${text.length} chars`)

  // Parse and validate with Zod schema
  const parsed = parseGeminiResponse(text, GeminiRecommendationsResponseSchema, 'generateRecommendationsFromMovies')

  if (!parsed.success) {
    logError('Gemini', parsed.error, { code: 'PARSE_ERROR', meta: { rawText: parsed.rawText } })
    return { safe: [], experimental: [] }
  }

  const { safe, experimental } = parsed.data

  // Filter duplicates using shared utility
  const safeFiltered = filterDuplicateTitles(safe, existingMovieTitles, r => r.title)
  const experimentalFiltered = filterDuplicateTitles(experimental, existingMovieTitles, r => r.title)

  console.log(`[Gemini] Results: ${safeFiltered.length} safe, ${experimentalFiltered.length} experimental (${safe.length - safeFiltered.length} safe dupes, ${experimental.length - experimentalFiltered.length} exp dupes)`)

  return {
    safe: safeFiltered,
    experimental: experimentalFiltered
  }
}

/**
 * Generate joint recommendations for two users watching together
 * Finds movies both users would enjoy based on their preferences
 */
export async function generateJointRecommendations(
  hostMovies: Array<{ movie_title: string; sentiment: string; reason: string }>,
  guestMovies: Array<{ movie_title: string; sentiment: string; reason: string }>,
  sharedPlatforms: string[] = []
): Promise<AIRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  // Separate preferences by sentiment for each user
  const hostLoved = hostMovies.filter(m => m.sentiment === 'loved' || m.sentiment === 'liked')
  const hostHated = hostMovies.filter(m => m.sentiment === 'hated' || m.sentiment === 'meh')
  const guestLoved = guestMovies.filter(m => m.sentiment === 'loved' || m.sentiment === 'liked')
  const guestHated = guestMovies.filter(m => m.sentiment === 'hated' || m.sentiment === 'meh')

  // Build platform section
  const platformSection = sharedPlatforms.length > 0
    ? `\nSHARED STREAMING PLATFORMS:\nBoth users have access to: ${sharedPlatforms.join(', ')}\nPrioritize content available on these platforms.`
    : ''

  // Get all movie titles to exclude from recommendations
  const allUserMovies = [...hostMovies, ...guestMovies].map(m => m.movie_title)

  const prompt = `You are an entertainment expert helping two people find a movie to watch together.

USER 1 PREFERENCES:
Loved/Liked:
${hostLoved.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n') || '- None specified'}
${hostHated.length > 0 ? `Disliked:\n${hostHated.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}` : ''}

USER 2 PREFERENCES:
Loved/Liked:
${guestLoved.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n') || '- None specified'}
${guestHated.length > 0 ? `Disliked:\n${guestHated.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}` : ''}
${platformSection}

DO NOT RECOMMEND these movies (already rated by users):
${allUserMovies.map(t => `- ${t}`).join('\n')}

TASK: Generate exactly 15 movie recommendations they would BOTH enjoy.

CRITICAL RULES:
1. AVOID movies similar in style/genre to what EITHER user disliked
2. PRIORITIZE movies that match tastes BOTH users loved
3. Find common ground - overlapping genres, directors, eras, or themes
4. Mix well-known crowd-pleasers with interesting discoveries
5. Only recommend movies, not TV shows (easier for a single watch session)
6. Diverse mix: different decades, countries, and styles

For ai_confidence scoring (0-100):
- 85-95: Strong match for BOTH users
- 75-84: Good match with clear appeal for both
- 65-74: Solid choice with some compromise
- Below 65: Risky pick

Respond with ONLY valid JSON - an array of 15 recommendations:
[{"title": "Movie Name", "year": 2020, "reasoning": "Why both would enjoy (max 80 chars)", "match_explanation": "How it bridges their tastes (max 100 chars)", "ai_confidence": 85, "available_on": "Platform1, Platform2"}]`

  console.log(`[Gemini] Joint recommendations - Host: ${hostMovies.length} movies, Guest: ${guestMovies.length} movies, Shared platforms: ${sharedPlatforms.length}`)

  const apiStartTime = Date.now()
  const result = await model.generateContent(prompt)
  const apiDuration = Date.now() - apiStartTime

  const text = result.response.text()
  console.log(`[Gemini] Joint API call: ${apiDuration}ms, Response: ${text.length} chars`)

  // Parse response
  const parsed = parseGeminiResponse(text, SimpleRecommendationsArraySchema, 'generateJointRecommendations')

  if (!parsed.success) {
    logError('Gemini', parsed.error, { code: 'PARSE_ERROR', meta: { rawText: parsed.rawText } })
    return []
  }

  // Filter out any movies that were in user lists
  const filtered = filterDuplicateTitles(parsed.data, allUserMovies, r => r.title)

  console.log(`[Gemini] Joint results: ${filtered.length} recommendations (${parsed.data.length - filtered.length} filtered)`)

  return filtered
}

export async function rescoreRecommendations(
  recommendations: Array<{
    id: string
    movie_title: string
    reasoning: string
    match_explanation?: string
  }>,
  userMovies: Array<{ movie_title: string; sentiment: string; reason: string }>
): Promise<Map<string, number>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  // Separate loved/liked from hated/meh
  const lovedMovies = userMovies.filter(m =>
    m.sentiment === 'loved' || m.sentiment === 'liked'
  )
  const dislikedMovies = userMovies.filter(m =>
    m.sentiment === 'hated' || m.sentiment === 'meh'
  )

  const prompt = `You are an entertainment expert. Score these existing recommendations based on how well they match the user's CURRENT taste profile.

USER'S LOVED MOVIES:
${lovedMovies.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}

${dislikedMovies.length > 0 ? `USER'S DISLIKED MOVIES:\n${dislikedMovies.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}` : ''}

RECOMMENDATIONS TO SCORE:
${recommendations.map((r, idx) => `${idx + 1}. "${r.movie_title}" - ${r.reasoning}${r.match_explanation ? ` (${r.match_explanation})` : ''}`).join('\n')}

For each recommendation, calculate a match confidence score (0-100) based on:
- Alignment with their loved movies (themes, styles, genres)
- Avoiding patterns from disliked movies
- Overall fit with their current taste profile

Use these guidelines:
- 85-95: Strong alignment with loved movies
- 70-84: Good match with some aspects of their taste
- 60-69: Moderate match or experimental pick
- Below 60: Weak alignment

Respond with ONLY valid JSON - an array of scores in the same order:
[85, 72, 90, 65, ...]`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Parse and validate with Zod schema
  const parsed = parseGeminiResponse(text, RescoreResponseSchema, 'rescoreRecommendations')

  if (!parsed.success) {
    logError('Gemini', parsed.error, { code: 'PARSE_ERROR', meta: { rawText: parsed.rawText } })
    return new Map()
  }

  const scores = parsed.data

  // Build map of recommendation ID to score
  const scoreMap = new Map<string, number>()
  recommendations.forEach((rec, idx) => {
    if (idx < scores.length) {
      // Ensure score is within valid range (schema already validates 0-100)
      scoreMap.set(rec.id, scores[idx])
    }
  })

  return scoreMap
}

