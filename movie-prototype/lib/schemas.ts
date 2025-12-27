import { z } from 'zod'

/**
 * Schema for a single AI recommendation from Gemini
 *
 * Design notes:
 * - Required fields have no defaults to catch AI response issues early
 * - Optional fields use .optional() not .default() to preserve null/undefined semantics
 */
export const AIRecommendationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  year: z.number().int().min(1888).max(2100).optional(),
  reasoning: z.string().max(200),
  match_explanation: z.string().max(300).optional(),
  ai_confidence: z.number().min(0).max(100),
  available_on: z.string().optional()
})

export type AIRecommendation = z.infer<typeof AIRecommendationSchema>

/**
 * Schema for the full Gemini recommendations response
 * Both arrays are required - empty arrays are valid but missing arrays are not
 */
export const GeminiRecommendationsResponseSchema = z.object({
  safe: z.array(AIRecommendationSchema),
  experimental: z.array(AIRecommendationSchema)
})

export type GeminiRecommendationsResponse = z.infer<typeof GeminiRecommendationsResponseSchema>

/**
 * Schema for simple recommendations (used by generateRecommendations and generateJointRecommendations)
 * Same as AIRecommendationSchema - unified for consistency
 */
export const SimpleRecommendationSchema = AIRecommendationSchema

export const SimpleRecommendationsArraySchema = z.array(SimpleRecommendationSchema)

/**
 * Schema for rescoring response (array of numbers)
 */
export const RescoreResponseSchema = z.array(
  z.number().min(0).max(100)
)

/**
 * Parse and validate Gemini JSON response with detailed error handling
 */
export function parseGeminiResponse<T>(
  rawText: string,
  schema: z.ZodType<T>,
  context: string
): { success: true; data: T } | { success: false; error: string; rawText: string } {
  // Clean markdown artifacts
  const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    const validated = schema.safeParse(parsed)

    if (!validated.success) {
      const issues = validated.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      return {
        success: false,
        error: `Validation failed for ${context}: ${issues}`,
        rawText: cleaned
      }
    }

    return { success: true, data: validated.data }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown parse error'
    return {
      success: false,
      error: `JSON parse failed for ${context}: ${message}`,
      rawText: cleaned
    }
  }
}
