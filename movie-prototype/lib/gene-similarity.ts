import { GoogleGenerativeAI } from '@google/generative-ai'
import { GENE_CONSOLIDATION } from './constants'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Cache embeddings to avoid redundant API calls
const embeddingCache = new Map<string, number[]>()

export async function getGeneEmbedding(geneText: string): Promise<number[] | null> {
  if (embeddingCache.has(geneText)) {
    return embeddingCache.get(geneText)!
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(geneText)
    const embedding = result.embedding.values
    
    embeddingCache.set(geneText, embedding)
    return embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    return null
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

export async function findSimilarGene(
  newGene: { gene_name: string; description: string },
  existingGenes: Array<{ gene_name: string; description: string; strength: number; id?: string }>
): Promise<{ similar: boolean; existingGene?: typeof existingGenes[0]; similarity?: number }> {
  if (existingGenes.length === 0) {
    return { similar: false }
  }

  // Combine name + description for better semantic matching
  const newGeneText = `${newGene.gene_name.replace(/_/g, ' ')} - ${newGene.description}`
  const newEmbedding = await getGeneEmbedding(newGeneText)
  
  // If embedding fails, skip similarity check (fallback to exact match)
  if (!newEmbedding) {
    return { similar: false }
  }

  // Batch fetch all embeddings in parallel (faster than sequential)
  const embeddingPromises = existingGenes.map(async (gene) => {
    const existingText = `${gene.gene_name.replace(/_/g, ' ')} - ${gene.description}`
    const embedding = await getGeneEmbedding(existingText)
    return { gene, embedding }
  })

  const embeddingResults = await Promise.all(embeddingPromises)

  let maxSimilarity = 0
  let mostSimilarGene = existingGenes[0]

  for (const { gene: existingGene, embedding: existingEmbedding } of embeddingResults) {
    // Skip if embedding failed
    if (!existingEmbedding) continue
    
    const similarity = cosineSimilarity(newEmbedding, existingEmbedding)

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      mostSimilarGene = existingGene
    }
  }

  // Use configured threshold
  if (maxSimilarity >= GENE_CONSOLIDATION.SIMILARITY_THRESHOLD) {
    return { 
      similar: true, 
      existingGene: mostSimilarGene,
      similarity: maxSimilarity 
    }
  }

  return { similar: false }
}

