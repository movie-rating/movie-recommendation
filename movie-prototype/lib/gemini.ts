import { GoogleGenerativeAI } from '@google/generative-ai'
import { RATING_MAP_UPPER, THRESHOLDS, GENE_STRENGTH, RECOMMENDATION_GENERATION } from './constants'

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

export async function extractTasteGenes(
  movieTitle: string,
  rating: string,
  reason: string,
  existingGenes: Array<{ gene_name: string; strength: number; description: string; is_negative: boolean }>
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  
  const isNegative = rating === 'meh' || rating === 'hated'
  
  const prompt = `You are a taste profiling expert. Analyze this movie feedback and extract taste genes - specific preference patterns.

Movie: "${movieTitle}"
Rating: ${rating.toUpperCase()}
${reason ? `User's reasoning: "${reason}"` : 'User provided no detailed reasoning.'}

${existingGenes.length > 0 ? `Known genes from previous feedback:
${existingGenes.map(g => `- ${g.gene_name} (strength: ${g.strength}/5)${g.is_negative ? ' [AVOID]' : ''}: ${g.description}`).join('\n')}

CRITICAL - GENE CONSOLIDATION:
Before creating a new gene, check if any existing gene captures the same pattern.
If your new insight matches an existing gene, return the EXISTING gene name with updated strength.
DO NOT create synonyms (e.g., if "period_setting" exists, don't create "historical_atmosphere").
Only create NEW genes for genuinely different preference patterns.` : ''}

Extract 1-6 taste genes depending on how much this movie reveals about their preferences:
- Extract MORE genes (4-6) if the movie/reasoning reveals multiple clear patterns
- Extract FEWER genes (1-3) if the signal is weak or the movie is straightforward
- Prioritize HIGH-CONFIDENCE patterns only
- Quality over quantity - only extract genes you're confident about

Extract taste genes following these rules:
1. Gene names: lowercase_with_underscores
2. Strength: 1-5 scale (5 = very strong)
3. is_negative: ${isNegative ? 'true (this is what they DISLIKE/AVOID)' : 'false (this is what they ENJOY)'}
4. Dealbreakers: true only for absolute requirements/rejections
5. Be specific and actionable

${reason ? '' : 'Since no reasoning was provided, infer preferences from the movie\'s known characteristics (genre, themes, style, pacing) and the rating.'}

${isNegative ? `For NEGATIVE ratings (meh/hate), focus on what to AVOID based on the movie's characteristics.` : `For POSITIVE ratings (love/like), focus on what they ENJOY based on the movie's characteristics.`}

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
  tasteGenes: Array<{ gene_name: string; strength: number; is_dealbreaker: boolean; is_negative: boolean; description: string; source_count?: number; source_multiplier?: number }>,
  tasteProfile: string,
  existingMovieTitles: string[],
  type: 'safe' | 'experimental',
  strictMode: boolean = false,
  userGuidance?: string
): Promise<AIRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  
  const count = type === 'safe' ? THRESHOLDS.SAFE_RECOMMENDATIONS : THRESHOLDS.EXPERIMENTAL_RECOMMENDATIONS
  const dealbreakers = tasteGenes.filter(g => g.is_dealbreaker)
  const negativeGenes = tasteGenes.filter(g => g.is_negative && g.strength >= GENE_STRENGTH.THRESHOLD_NEGATIVE)
  const positiveGenes = tasteGenes.filter(g => !g.is_negative && g.strength >= GENE_STRENGTH.THRESHOLD_STRONG && !g.is_dealbreaker)
  
  // Build guidance section for prompt
  const guidanceSection = userGuidance 
    ? `

USER'S SPECIFIC DIRECTION FOR THIS BATCH:
"${userGuidance}"

IMPORTANT: Blend this guidance with their taste DNA.
- Find recommendations that satisfy BOTH their core preferences AND this specific direction
- Still respect dealbreakers and strong negative preferences
- If guidance conflicts with taste genes, find creative overlap or adjacent matches
- Example: If user loves period dramas but asks for sci-fi, suggest thoughtful, character-driven sci-fi
`
    : ''

  // Build exclusion section for prompt
  const maxTitlesToShow = strictMode ? RECOMMENDATION_GENERATION.EXCLUSION_LIST_STRICT : RECOMMENDATION_GENERATION.EXCLUSION_LIST_NORMAL
  const exclusionSection = existingMovieTitles.length > 0 
    ? `

${strictMode ? '⚠️ CRITICAL - STRICT MODE ⚠️' : ''}
DO NOT RECOMMEND - Already in their system (${existingMovieTitles.length} titles):
${strictMode ? 'This is a RETRY. The previous attempt had too many duplicates.' : ''}
These movies/shows have already been suggested, watched, or are in their watchlist.
You MUST avoid recommending ANY of these titles:
${existingMovieTitles.slice(0, maxTitlesToShow).map(title => `- ${title}`).join('\n')}
${existingMovieTitles.length > maxTitlesToShow ? `... and ${existingMovieTitles.length - maxTitlesToShow} more titles to avoid` : ''}

${strictMode ? 'VERIFY EACH RECOMMENDATION: Before including any title, explicitly check it against the exclusion list above.' : 'CRITICAL: Before including any recommendation, verify it\'s NOT in the above list.'}
`
    : ''
  
  const prompt = type === 'safe' 
    ? `You are an entertainment expert. Generate ${count} movie or TV show recommendations that align closely with this user's taste profile.

TASTE PROFILE:
${tasteProfile}
${guidanceSection}
${exclusionSection}

WHAT THEY ENJOY (Strength 4-5, with multi-source validation):
${positiveGenes.map(g => {
  const sourceInfo = g.source_count && g.source_count > 1 
    ? ` [${g.source_count}x validated - HIGH CONFIDENCE]` 
    : ''
  return `- ${g.gene_name} (strength: ${g.strength}/5${sourceInfo}): ${g.description}`
}).join('\n')}

${negativeGenes.length > 0 ? `WHAT TO AVOID (Strength 3+, with multi-source validation):
${negativeGenes.map(g => {
  const sourceInfo = g.source_count && g.source_count > 1 
    ? ` [${g.source_count}x validated - HIGH CONFIDENCE]` 
    : ''
  return `- ${g.gene_name} (strength: ${g.strength}/5${sourceInfo}): ${g.description}`
}).join('\n')}` : ''}

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

For each recommendation, provide:
1. title: Movie or TV show title
2. year: Release year
3. reasoning: Brief pitch (max 80 chars)
4. match_explanation: Conversational explanation mentioning which specific taste genes it aligns with (max 120 chars)
   Examples:
   - "This matches your love for period settings and character-driven narratives"
   - "Combines your preferences for mind-bending plots and intellectual engagement"
   - "Aligns with your taste for gritty crime dramas while avoiding slow pacing"
5. ai_confidence: 0-100 match strength
   - 85-95: Excellent alignment with multiple strong taste genes
   - 75-84: Good alignment with their core preferences
   - 70-74: Solid match but less certain

Respond with ONLY valid JSON:
[{"title": "Movie Name", "year": 2020, "reasoning": "Brief pitch", "match_explanation": "This matches your love for X and Y", "ai_confidence": 85}]`
    : `You are an entertainment expert. Generate ${count} EXPERIMENTAL movie or TV show recommendations that expand this user's taste.

TASTE PROFILE:
${tasteProfile}
${guidanceSection}
${exclusionSection}

POSITIVE PREFERENCES (with multi-source validation):
${positiveGenes.map(g => {
  const sourceInfo = g.source_count && g.source_count > 1 
    ? ` [${g.source_count}x validated]` 
    : ''
  return `- ${g.gene_name} (${g.strength}/5${sourceInfo}): ${g.description}`
}).join('\n')}

${negativeGenes.length > 0 ? `MUST AVOID (Negative preferences with multi-source validation):
${negativeGenes.map(g => {
  const sourceInfo = g.source_count && g.source_count > 1 
    ? ` [${g.source_count}x validated]` 
    : ''
  return `- ${g.gene_name} (${g.strength}/5${sourceInfo}): ${g.description}`
}).join('\n')}` : ''}

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

For each experimental recommendation, provide:
1. title: Movie or TV show title
2. year: Release year
3. reasoning: Brief pitch (max 80 chars)
4. match_explanation: Explain how this explores new territory while respecting their core preferences (max 120 chars)
   Examples:
   - "Expands on your love for complex narratives into the sci-fi space"
   - "Similar character depth to what you enjoy, but in a lighter comedic tone"
5. ai_confidence: 0-100 match strength
   - 70-80: Well-reasoned stretch with good potential
   - 60-69: Interesting exploration, moderate confidence
   - 50-59: Bold experiment, lower certainty

Respond with ONLY valid JSON:
[{"title": "Movie Name", "year": 2020, "reasoning": "Brief pitch", "match_explanation": "Expands on your love for X into Y", "ai_confidence": 70}]`

  // Log prompt characteristics
  console.log(`[LLM Start] ${type}${strictMode ? ' [STRICT]' : ''}: Prompt ${(prompt.length/1024).toFixed(1)}KB, ${existingMovieTitles.length} exclusions`)
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:before-api',message:'Calling Gemini',data:{type,strictMode,hasGuidance:!!userGuidance,guidance:userGuidance?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  // Time the API call
  const apiStart = Date.now()
  const result = await model.generateContent(prompt)
  const apiDuration = Date.now() - apiStart
  console.log(`[LLM API] ${type}: ${apiDuration}ms`)
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:api-response',message:'API returned',data:{type,textLength:result.response.text().length,preview:result.response.text().substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  const text = result.response.text()
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:before-parse',message:'About to parse JSON',data:{type,cleanedLength:cleaned.length,cleanedPreview:cleaned.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion
  
  try {
    const recommendations = JSON.parse(cleaned)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:parse-success',message:'JSON parsed',data:{type,count:recommendations.length,hasMatchExplanation:recommendations[0]?.match_explanation !== undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return recommendations
  } catch (parseError) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:parse-error',message:'JSON parse failed',data:{type,error:parseError instanceof Error ? parseError.message : String(parseError),cleaned:cleaned.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
    // #endregion
    throw parseError
  }
  
  // Filter duplicates - both against existing and internally
  const existingLower = existingMovieTitles.map(t => t.toLowerCase())
  const seen = new Set<string>()
  
  const originalCount = recommendations.length
  const filtered = recommendations.filter((r: AIRecommendation) => {
    const titleLower = r.title.toLowerCase()
    if (existingLower.includes(titleLower)) return false
    if (seen.has(titleLower)) return false
    seen.add(titleLower)
    return true
  })
  
  const filteredCount = filtered.length
  const duplicateCount = originalCount - filteredCount
  
  if (duplicateCount > 0) {
    console.log(`[LLM Filter] ${type}: ${duplicateCount}/${originalCount} duplicates removed`)
  }
  
  return filtered
}

type AIRecommendation = {
  title: string
  year?: number
  reasoning: string
  match_explanation: string
  ai_confidence: number
}

export async function generateDiverseRecommendationsWithRetry(
  originalMovies: Array<{ movie_title: string; sentiment: string; reason: string }>,
  tasteGenes: Array<{ gene_name: string; strength: number; is_dealbreaker: boolean; is_negative: boolean; description: string; source_count?: number; source_multiplier?: number }>,
  tasteProfile: string,
  existingMovieTitles: string[],
  type: 'safe' | 'experimental',
  userGuidance?: string,
  maxRetries: number = RECOMMENDATION_GENERATION.MAX_RETRIES
): Promise<AIRecommendation[]> {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:retry-wrapper',message:'Retry wrapper called',data:{type,hasGuidance:!!userGuidance,guidancePreview:userGuidance?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
  // #endregion
  
  const targetCount = type === 'safe' ? THRESHOLDS.SAFE_RECOMMENDATIONS : THRESHOLDS.EXPERIMENTAL_RECOMMENDATIONS
  
  try {
    // First attempt
    let recommendations = await generateDiverseRecommendations(
    originalMovies,
    tasteGenes,
    tasteProfile,
    existingMovieTitles,
    type,
    false, // Not strict mode on first attempt
    userGuidance
  )
  
  // Calculate duplicate rate
  const duplicateRate = 1 - (recommendations.length / targetCount)

  // If more than threshold were duplicates, retry with stronger instructions
  if (duplicateRate > RECOMMENDATION_GENERATION.DUPLICATE_RETRY_THRESHOLD && maxRetries > 0) {
    console.log(`[Retry] ${Math.round(duplicateRate * 100)}% duplicates detected for ${type} recommendations, retrying with strict mode...`)
    
    recommendations = await generateDiverseRecommendations(
      originalMovies,
      tasteGenes,
      tasteProfile,
      existingMovieTitles,
      type,
      true, // Strict mode for retry
      userGuidance
    )
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:retry-exit',message:'Returning from retry wrapper',data:{type,count:recommendations.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  return recommendations
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.ts:retry-error',message:'Error in retry wrapper',data:{type,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    throw error
  }
}

