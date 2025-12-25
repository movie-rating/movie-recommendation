import type { TasteGene } from './types'

/**
 * Calculate final match score using hybrid approach:
 * - AI-generated confidence (base)
 * - Taste gene matching (boost/penalty)
 */
export function calculateFinalMatchScore(
  aiConfidence: number,
  reasoning: string,
  userTasteGenes: TasteGene[],
  isExperimental: boolean
): number {
  let finalScore = aiConfidence
  
  // Extract keywords from reasoning
  const reasoningLower = reasoning.toLowerCase()
  
  // Boost for positive gene matches (max +15%)
  const positiveGenes = userTasteGenes.filter(g => !g.is_negative)
  let positiveBoost = 0
  
  for (const gene of positiveGenes) {
    const geneKeywords = gene.gene_name.split('_')
    const matchCount = geneKeywords.filter(kw => 
      reasoningLower.includes(kw)
    ).length
    
    if (matchCount > 0) {
      // Stronger genes = bigger boost
      positiveBoost += (gene.strength / 5) * 5 * matchCount
    }
  }
  
  finalScore = Math.min(finalScore + positiveBoost, 100)
  
  // Penalize for negative gene conflicts (max -20%)
  const negativeGenes = userTasteGenes.filter(g => g.is_negative)
  let negativePenalty = 0
  
  for (const gene of negativeGenes) {
    const geneKeywords = gene.gene_name.split('_')
    const matchCount = geneKeywords.filter(kw => 
      reasoningLower.includes(kw)
    ).length
    
    if (matchCount > 0) {
      negativePenalty += (gene.strength / 5) * 7 * matchCount
    }
  }
  
  finalScore = Math.max(finalScore - negativePenalty, 30)
  
  // Experimental recommendations: cap at 85%
  if (isExperimental) {
    finalScore = Math.min(finalScore, 85)
  }
  
  return Math.round(finalScore)
}


