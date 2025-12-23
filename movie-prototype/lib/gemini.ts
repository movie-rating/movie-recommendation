import { GoogleGenerativeAI } from '@google/generative-ai'
import { RATING_MAP_UPPER, THRESHOLDS, GENE_STRENGTH } from './constants'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateRecommendations(
  movies: Array<{ title: string; sentiment: string; reason: string }>
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  
  const prompt = `You are an entertainment expert. Based on these ratings, suggest exactly ${THRESHOLDS.TOTAL_RECOMMENDATIONS} movies or TV shows they would enjoy.

User's ratings:
${movies.map(m => {
  return `${RATING_MAP_UPPER[m.sentiment as keyof typeof RATING_MAP_UPPER] || m.sentiment.toUpperCase()}: "${m.title}" - ${m.reason}`
}).join('\n')}

Respond with ONLY valid JSON, no markdown or code blocks:
[{"title": "Movie Name", "year": 2020, "reasoning": "Why they'd enjoy it (max 100 chars)"}]`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  // Clean any markdown artifacts
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

export async function extractTasteGenes(
  movieTitle: string,
  rating: string,
  reason: string,
  existingGenes: Array<{ gene_name: string; strength: number; description: string; is_negative: boolean }>
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  
  const isNegative = rating === 'meh' || rating === 'hated'
  
  const prompt = `You are a taste profiling expert. Analyze this movie feedback and extract 2-4 "taste genes" - specific preference patterns.

Movie: "${movieTitle}"
Rating: ${rating.toUpperCase()}
User's reasoning: "${reason}"

${existingGenes.length > 0 ? `Known genes from previous feedback:
${existingGenes.map(g => `- ${g.gene_name} (strength: ${g.strength}/5)${g.is_negative ? ' [AVOID]' : ''}: ${g.description}`).join('\n')}

Update strengths if this feedback validates existing genes, or add new genes if you discover new patterns.` : ''}

Extract taste genes following these rules:
1. Gene names: lowercase_with_underscores
2. Strength: 1-5 scale (5 = very strong)
3. is_negative: ${isNegative ? 'true (this is what they DISLIKE/AVOID)' : 'false (this is what they ENJOY)'}
4. Dealbreakers: true only for absolute requirements/rejections
5. Be specific and actionable

${isNegative ? `For NEGATIVE ratings (meh/hate), focus on what to AVOID:
- "slow_pacing_intolerable" not "likes_fast_pacing"
- "no_pretentious_art_films" not "likes_accessible_films"
- "avoid_gore_violence" not "likes_mild_content"` : `For POSITIVE ratings (love/like), focus on what they ENJOY:
- "smart_but_accessible" not "avoids_dumb_movies"
- "emotional_anchor_required" not "no_cold_intellectualism"
- "character_driven_stories" not "avoids_plot_only_films"`}

Respond with ONLY valid JSON:
{
  "genes": [
    {
      "gene_name": "smart_but_accessible",
      "strength": 5,
      "is_negative": ${isNegative},
      "is_dealbreaker": false,
      "description": "${isNegative ? 'What they want to AVOID' : 'What they ENJOY'}"
    }
  ],
  "profile_update": "Brief insight about what this reveals (1 sentence)"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

export async function generateDiverseRecommendations(
  originalMovies: Array<{ movie_title: string; sentiment: string; reason: string }>,
  tasteGenes: Array<{ gene_name: string; strength: number; is_dealbreaker: boolean; is_negative: boolean; description: string }>,
  tasteProfile: string,
  existingMovieTitles: string[],
  type: 'safe' | 'experimental'
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  
  const count = type === 'safe' ? THRESHOLDS.SAFE_RECOMMENDATIONS : THRESHOLDS.EXPERIMENTAL_RECOMMENDATIONS
  const dealbreakers = tasteGenes.filter(g => g.is_dealbreaker)
  const negativeGenes = tasteGenes.filter(g => g.is_negative && g.strength >= GENE_STRENGTH.THRESHOLD_NEGATIVE)
  const positiveGenes = tasteGenes.filter(g => !g.is_negative && g.strength >= GENE_STRENGTH.THRESHOLD_STRONG && !g.is_dealbreaker)
  
  const prompt = type === 'safe' 
    ? `You are an entertainment expert. Generate ${count} movie or TV show recommendations that align closely with this user's taste profile.

TASTE PROFILE:
${tasteProfile}

WHAT THEY ENJOY (Strength 4-5):
${positiveGenes.map(g => `- ${g.gene_name}: ${g.description}`).join('\n')}

${negativeGenes.length > 0 ? `WHAT TO AVOID (Strength 3+):
${negativeGenes.map(g => `- ${g.gene_name}: ${g.description}`).join('\n')}` : ''}

${dealbreakers.length > 0 ? `DEALBREAKERS (ABSOLUTE REQUIREMENTS):
${dealbreakers.map(g => `- ${g.gene_name}: ${g.description}`).join('\n')}` : ''}

CRITICAL - DIVERSITY:
Ensure variety across the ${count} recommendations:
- Mix of MOVIES and TV SHOWS (aim for 60% movies, 40% TV)
- Different genres (action, drama, thriller, comedy, sci-fi, romance, horror, etc.)
- Different decades (classic to modern)
- Different countries/cultures (Hollywood, international, indie)
- Mix of popular blockbusters/hits and critically acclaimed

Generate ${count} movies and TV shows that strongly match their core preferences while maintaining this diversity.

Respond with ONLY valid JSON:
[{"title": "Movie Name", "year": 2020, "reasoning": "Why it matches their taste (max 100 chars)", "confidence": "high"}]`
    : `You are an entertainment expert. Generate ${count} EXPERIMENTAL movie or TV show recommendations that expand this user's taste.

TASTE PROFILE:
${tasteProfile}

POSITIVE PREFERENCES:
${positiveGenes.map(g => `- ${g.gene_name} (${g.strength}/5): ${g.description}`).join('\n')}

${negativeGenes.length > 0 ? `MUST AVOID (Negative preferences):
${negativeGenes.map(g => `- ${g.gene_name} (${g.strength}/5): ${g.description}`).join('\n')}` : ''}

${dealbreakers.length > 0 ? `DEALBREAKERS (ABSOLUTE):
${dealbreakers.map(g => `- ${g.gene_name}: ${g.description}`).join('\n')}` : ''}

CRITICAL - MAXIMUM DIVERSITY:
For experimental picks, prioritize VARIETY even more:
1. Mix movies AND TV shows (lean toward TV for experimental)
2. Explore genres they haven't seen yet
3. Different time periods and cultures
4. Mix acclaimed foreign films, prestige TV, documentaries, classics
5. Push boundaries while respecting dealbreakers

Generate ${count} movies or TV shows that:
1. Respect dealbreakers but push other boundaries
2. Explore adjacent genres/styles they haven't tried
3. Match some core genes but introduce new elements
4. Have high critical acclaim to justify the stretch

These should be "safe experiments" - different but likely to succeed.

Respond with ONLY valid JSON:
[{"title": "Movie Name", "year": 2020, "reasoning": "Why this stretch makes sense (max 100 chars)", "confidence": "experimental"}]`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const recommendations = JSON.parse(cleaned)
  
  // Filter duplicates
  const existingLower = existingMovieTitles.map(t => t.toLowerCase())
  return recommendations.filter((r: any) => 
    !existingLower.includes(r.title.toLowerCase())
  )
}

