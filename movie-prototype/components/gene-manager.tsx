'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { updateGeneAction, deleteGeneAction, regenerateWithGenesAction } from '@/app/recommendations/gene-actions'
import { useRouter } from 'next/navigation'
import type { TasteGene } from '@/lib/types'
import { RegenerateModal } from './regenerate-modal'

export function GeneManager({ 
  genes,
  sessionHasFeedback 
}: {
  genes: TasteGene[]
  sessionHasFeedback: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const router = useRouter()

  if (genes.length === 0) {
    return (
      <div className="mb-8 p-6 bg-card rounded-lg border">
        <h3 className="text-lg font-bold mb-2">Your Taste DNA</h3>
        <p className="text-sm text-muted-foreground">
          {sessionHasFeedback 
            ? "Your taste profile is being analyzed. Rate more movies to see your taste genes!"
            : "Rate movies from your recommendations to build your taste profile. We'll identify patterns in what you love and avoid."
          }
        </p>
      </div>
    )
  }

  const positiveGenes = genes.filter(g => !g.is_negative)
  const negativeGenes = genes.filter(g => g.is_negative)

  const handleBoost = async (geneId: string, currentStrength: number) => {
    if (currentStrength >= 5) return
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gene-manager.tsx:26',message:'Boost clicked',data:{geneId,currentStrength,newStrength:currentStrength+1},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    const result = await updateGeneAction(geneId, { strength: Math.min(currentStrength + 1, 5) })
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gene-manager.tsx:30',message:'Boost result',data:{success:result.success,error:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion
    router.refresh()
  }

  const handleDemote = async (geneId: string, currentStrength: number) => {
    if (currentStrength <= 1) return
    await updateGeneAction(geneId, { strength: Math.max(currentStrength - 1, 1) })
    router.refresh()
  }

  const handleToggleDealbreaker = async (geneId: string, isDealbreaker: boolean) => {
    await updateGeneAction(geneId, { is_dealbreaker: !isDealbreaker })
    router.refresh()
  }

  const handleDelete = async (geneId: string) => {
    if (!confirm('Remove this preference from your profile?')) return
    await deleteGeneAction(geneId)
    router.refresh()
  }

  const handleRegenerate = async (guidance: string) => {
    setLoading(true)
    setError(null)
    const result = await regenerateWithGenesAction(guidance)
    setLoading(false)
    if (result.success) {
      setShowRegenerateModal(false)
      router.refresh()
    } else {
      setError(result.error || 'Failed to regenerate')
    }
  }

  return (
    <div className="mb-8 p-6 bg-card rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Your Taste DNA</h3>
        <div className="flex gap-2">
          {sessionHasFeedback && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRegenerateModal(true)}
              disabled={loading}
            >
              {loading ? 'Regenerating...' : '🔄 Regenerate Recs'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Collapse' : 'Manage Genes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20 mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <RegenerateModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onSubmit={handleRegenerate}
        loading={loading}
      />

      {expanded ? (
        <div className="space-y-6">
          {positiveGenes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                <span>✓</span> What You Enjoy
              </p>
              <div className="space-y-3">
                {positiveGenes.map(gene => {
                  const isStronglyValidated = gene.source_count && gene.source_count >= 3
                  return (
                  <div 
                    key={gene.id} 
                    className={`flex items-start gap-3 p-3 bg-background rounded-lg border ${
                      isStronglyValidated ? 'border-green-500/40 shadow-sm shadow-green-500/20' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {gene.gene_name.replace(/_/g, ' ')}
                        </p>
                        {gene.source_count && gene.source_count > 1 && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 rounded font-medium">
                            {gene.source_count}x validated
                          </span>
                        )}
                        {gene.source_multiplier && gene.source_multiplier > 1.0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-mono">
                            ×{gene.source_multiplier.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{gene.description}</p>
                      {gene.sources && gene.sources.length > 0 ? (
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                          <p className="font-medium mb-1">Validated by {gene.sources.length} movie{gene.sources.length > 1 ? 's' : ''}:</p>
                          <div className="space-y-0.5">
                            {gene.sources.map(s => (
                              <p key={s.id} className="text-muted-foreground">
                                • {s.source_movie_title} ({s.source_rating})
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : gene.source_movie_title && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          From: {gene.source_movie_title}
                          {gene.source_rating && ` (${gene.source_rating})`}
                        </p>
                      )}
                      {gene.is_dealbreaker && (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">
                          Dealbreaker
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < gene.strength ? 'bg-green-500' : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBoost(gene.id, gene.strength)}
                          disabled={gene.strength >= 5}
                          className="h-6 px-2 text-xs"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDemote(gene.id, gene.strength)}
                          disabled={gene.strength <= 1}
                          className="h-6 px-2 text-xs"
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleDealbreaker(gene.id, gene.is_dealbreaker)}
                          className="h-6 px-2 text-xs"
                          title={gene.is_dealbreaker ? 'Remove dealbreaker' : 'Make dealbreaker'}
                        >
                          {gene.is_dealbreaker ? '🔓' : '🔒'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(gene.id)}
                          className="h-6 px-2 text-xs text-destructive"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {negativeGenes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                <span>✗</span> What to Avoid
              </p>
              <div className="space-y-3">
                {negativeGenes.map(gene => {
                  const isStronglyValidated = gene.source_count && gene.source_count >= 3
                  return (
                  <div 
                    key={gene.id} 
                    className={`flex items-start gap-3 p-3 bg-background rounded-lg border border-red-500/20 ${
                      isStronglyValidated ? 'border-red-500/50 shadow-sm shadow-red-500/20' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {gene.gene_name.replace(/_/g, ' ')}
                        </p>
                        {gene.source_count && gene.source_count > 1 && (
                          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-700 dark:text-red-300 rounded font-medium">
                            {gene.source_count}x validated
                          </span>
                        )}
                        {gene.source_multiplier && gene.source_multiplier > 1.0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-mono">
                            ×{gene.source_multiplier.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{gene.description}</p>
                      {gene.sources && gene.sources.length > 0 ? (
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                          <p className="font-medium mb-1">Validated by {gene.sources.length} movie{gene.sources.length > 1 ? 's' : ''}:</p>
                          <div className="space-y-0.5">
                            {gene.sources.map(s => (
                              <p key={s.id} className="text-muted-foreground">
                                • {s.source_movie_title} ({s.source_rating})
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : gene.source_movie_title && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          From: {gene.source_movie_title}
                          {gene.source_rating && ` (${gene.source_rating})`}
                        </p>
                      )}
                      {gene.is_dealbreaker && (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-destructive/20 text-destructive rounded">
                          Hard Dealbreaker
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < gene.strength ? 'bg-red-500' : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBoost(gene.id, gene.strength)}
                          disabled={gene.strength >= 5}
                          className="h-6 px-2 text-xs"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDemote(gene.id, gene.strength)}
                          disabled={gene.strength <= 1}
                          className="h-6 px-2 text-xs"
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleDealbreaker(gene.id, gene.is_dealbreaker)}
                          className="h-6 px-2 text-xs"
                          title={gene.is_dealbreaker ? 'Remove dealbreaker' : 'Make dealbreaker'}
                        >
                          {gene.is_dealbreaker ? '🔓' : '🔒'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(gene.id)}
                          className="h-6 px-2 text-xs text-destructive"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Tip: Boost genes you want prioritized, demote ones that are less important, or lock as dealbreakers for absolute preferences.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {positiveGenes.slice(0, 3).map(gene => (
            <div key={gene.id} className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">
                    {gene.gene_name.replace(/_/g, ' ')}
                  </p>
                  {gene.source_count && gene.source_count > 1 && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 rounded">
                      {gene.source_count}x
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < gene.strength ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {negativeGenes.slice(0, 3).map(gene => (
            <div key={gene.id} className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400">✗</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">
                    {gene.gene_name.replace(/_/g, ' ')}
                  </p>
                  {gene.source_count && gene.source_count > 1 && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-700 dark:text-red-300 rounded">
                      {gene.source_count}x
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < gene.strength ? 'bg-red-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}

          {genes.length > 6 && (
            <p className="text-xs text-muted-foreground text-center">
              +{genes.length - 6} more genes
            </p>
          )}
        </div>
      )}
    </div>
  )
}

