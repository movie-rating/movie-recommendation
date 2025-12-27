import { GoogleGenerativeAI } from '@google/generative-ai'
import { RATING_MAP_UPPER, THRESHOLDS, RECOMMENDATION_GENERATION } from './constants'
import './env'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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
  
  // Clean any markdown artifacts
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
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
    ? `\n\n🎬 STREAMING PLATFORM CONSTRAINT:
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
  
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  
  // Filter duplicates
  const existingLower = existingMovieTitles.map(t => t.toLowerCase())
  
  const filterDupes = (recs: AIRecommendation[]) => {
    const seen = new Set<string>()
    return recs.filter(r => {
      const titleLower = r.title.toLowerCase()
      if (existingLower.includes(titleLower) || seen.has(titleLower)) return false
      seen.add(titleLower)
      return true
    })
  }
  
  const safeFiltered = filterDupes(parsed.safe || [])
  const experimentalFiltered = filterDupes(parsed.experimental || [])
  
  console.log(`[Gemini] Results: ${safeFiltered.length} safe, ${experimentalFiltered.length} experimental (${(parsed.safe?.length || 0) - safeFiltered.length} safe dupes, ${(parsed.experimental?.length || 0) - experimentalFiltered.length} exp dupes)`)
  
  return {
    safe: safeFiltered,
    experimental: experimentalFiltered
  }
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
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const scores = JSON.parse(cleaned) as number[]
  
  // Build map of recommendation ID to score
  const scoreMap = new Map<string, number>()
  recommendations.forEach((rec, idx) => {
    if (idx < scores.length) {
      // Ensure score is within valid range
      const score = Math.max(0, Math.min(100, scores[idx]))
      scoreMap.set(rec.id, score)
    }
  })
  
  return scoreMap
}

type AIRecommendation = {
  title: string
  year?: number
  reasoning: string
  match_explanation: string
  ai_confidence: number
  available_on?: string
}

