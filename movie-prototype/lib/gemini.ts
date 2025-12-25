import { GoogleGenerativeAI } from '@google/generative-ai'
import { RATING_MAP_UPPER, THRESHOLDS, RECOMMENDATION_GENERATION } from './constants'

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
  userGuidance?: string
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
  
  const prompt = `You are an entertainment expert. Generate movie and TV show recommendations.

USER'S LOVED MOVIES:
${lovedMovies.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}

${dislikedMovies.length > 0 ? `USER'S DISLIKED MOVIES:\n${dislikedMovies.map(m => `- "${m.movie_title}"${m.reason ? `: ${m.reason}` : ''}`).join('\n')}` : ''}
${exclusionSection}
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
- Each recommendation needs: title, year, reasoning (max 80 chars), match_explanation (max 120 chars), ai_confidence (0-100)

Respond with ONLY valid JSON:
{
  "safe": [
    {"title": "Movie Name", "year": 2020, "reasoning": "Brief pitch", "match_explanation": "Why this matches", "ai_confidence": 85}
  ],
  "experimental": [
    {"title": "Movie Name", "year": 2020, "reasoning": "Brief pitch", "match_explanation": "Why this expands their taste", "ai_confidence": 70}
  ]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
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
  
  return {
    safe: filterDupes(parsed.safe || []),
    experimental: filterDupes(parsed.experimental || [])
  }
}

type AIRecommendation = {
  title: string
  year?: number
  reasoning: string
  match_explanation: string
  ai_confidence: number
}

