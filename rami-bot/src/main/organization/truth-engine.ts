import { appEvents } from '../events'
import { memoryManager } from '../learning/memory-manager'

/**
 * Truth & Verification Engine
 * Separates facts from assumptions, requires evidence, and assigns confidence scores
 */

export interface Evidence {
    source: string // URL, file path, or 'internal'
    type: 'web' | 'document' | 'memory' | 'reasoning'
    content: string
    reliability: number // 0-1
    timestamp: number
}

export interface VerifiedClaim {
    claim: string
    confidence: number // 0-1
    evidence: Evidence[]
    contradictions?: string[]
    classification: 'fact' | 'assumption' | 'opinion' | 'uncertain'
}

export class TruthEngine {
    private minEvidenceThreshold = 0.6
    private minSourceCount = 1 // For high-confidence claims, require 2+ sources

    /**
     * Assess source quality based on domain and type
     */
    assessSourceQuality(source: string, type: Evidence['type']): number {
        // Domain-based reliability scoring
        const domainReliability: Record<string, number> = {
            '.gov': 0.9,
            '.edu': 0.85,
            'wikipedia.org': 0.7,
            'arxiv.org': 0.8,
            'github.com': 0.75,
            'stackoverflow.com': 0.7,
            'medium.com': 0.5,
            // Add more as needed
        }

        // Check domain
        for (const [domain, score] of Object.entries(domainReliability)) {
            if (source.includes(domain)) {
                return score
            }
        }

        // Type-based fallback
        switch (type) {
            case 'document': return 0.8
            case 'memory': return 0.6
            case 'reasoning': return 0.5
            case 'web': return 0.5 // Unknown web source
            default: return 0.4
        }
    }

    /**
     * Verify a claim by checking evidence and cross-referencing
     */
    async verifyClaim(claim: string, evidence: Evidence[]): Promise<VerifiedClaim> {
        // Calculate base confidence from evidence
        let confidence = 0

        if (evidence.length === 0) {
            return {
                claim,
                confidence: 0.3,
                evidence: [],
                classification: 'assumption'
            }
        }

        // Assess quality of each source and use that for reliability
        const qualityAdjustedEvidence = evidence.map(e => ({
            ...e,
            reliability: this.assessSourceQuality(e.source, e.type)
        }))

        // Average reliability of sources
        const avgReliability = qualityAdjustedEvidence.reduce((sum, e) => sum + e.reliability, 0) / qualityAdjustedEvidence.length
        confidence = avgReliability

        // Boost for multiple independent sources
        if (qualityAdjustedEvidence.length >= 2) {
            confidence = Math.min(1, confidence + 0.15)
        }

        // Cross-check: detect contradictions across sources
        const contradictions = await this.crossCheckSources(claim, qualityAdjustedEvidence)
        if (contradictions.length > 0) {
            confidence = Math.max(0, confidence - 0.3)
        }

        // Check for contradictions in memory
        const memoryContradictions = await this.findContradictions(claim)
        if (memoryContradictions.length > 0) {
            confidence = Math.max(0, confidence - 0.2)
            contradictions.push(...memoryContradictions)
        }

        // Classify
        let classification: 'fact' | 'assumption' | 'opinion' | 'uncertain'
        if (confidence >= 0.8 && qualityAdjustedEvidence.length >= 2) {
            classification = 'fact'
        } else if (confidence >= 0.5) {
            classification = 'uncertain'
        } else {
            classification = 'assumption'
        }

        const result: VerifiedClaim = {
            claim,
            confidence,
            evidence: qualityAdjustedEvidence,
            contradictions: contradictions.length > 0 ? contradictions : undefined,
            classification
        }

        // Broadcast to synergy system
        appEvents.emit('org:truth_claim', result)

        return result
    }

    /**
     * Check if this claim contradicts existing memory
     */
    private async findContradictions(claim: string): Promise<string[]> {
        const memories = await memoryManager.recall(claim, { limit: 3 })
        const contradictions: string[] = []

        if (!memories || !Array.isArray(memories)) return []

        for (const mem of memories) {
            // Simple heuristic: check for negation words
            const claimLower = claim.toLowerCase()
            const memLower = mem.content.toLowerCase()

            const negationWords = ['not', 'never', 'no', 'false', 'incorrect']
            const hasNegation = negationWords.some(word =>
                (claimLower.includes(word) && !memLower.includes(word)) ||
                (!claimLower.includes(word) && memLower.includes(word))
            )

            if (hasNegation) {
                contradictions.push(mem.content)
            }
        }

        return contradictions
    }

    /**
     * Cross-check multiple sources for contradictions
     */
    private async crossCheckSources(claim: string, evidence: Evidence[]): Promise<string[]> {
        if (evidence.length < 2) return []

        const contradictions: string[] = []

        // Simple heuristic: look for conflicting keywords across sources
        const keywords = ['yes', 'no', 'true', 'false', 'correct', 'incorrect', 'confirmed', 'denied']

        for (let i = 0; i < evidence.length; i++) {
            for (let j = i + 1; j < evidence.length; j++) {
                const source1 = evidence[i].content.toLowerCase()
                const source2 = evidence[j].content.toLowerCase()

                // Check for opposite keywords
                const hasContradiction = keywords.some(kw => {
                    const opposite = this.getOpposite(kw)
                    return (source1.includes(kw) && source2.includes(opposite)) ||
                        (source1.includes(opposite) && source2.includes(kw))
                })

                if (hasContradiction) {
                    contradictions.push(`Source ${evidence[i].source} conflicts with ${evidence[j].source}`)
                }
            }
        }

        return contradictions
    }

    private getOpposite(keyword: string): string {
        const opposites: Record<string, string> = {
            'yes': 'no',
            'no': 'yes',
            'true': 'false',
            'false': 'true',
            'correct': 'incorrect',
            'incorrect': 'correct',
            'confirmed': 'denied',
            'denied': 'confirmed'
        }
        return opposites[keyword] || keyword
    }

    /**
     * Should we refuse to answer based on low confidence?
     */
    shouldRefuse(verified: VerifiedClaim): boolean {
        return verified.confidence < this.minEvidenceThreshold
    }

    /**
     * Generate a user-facing explanation
     */
    explainVerification(verified: VerifiedClaim): string {
        const confidencePct = Math.round(verified.confidence * 100)
        let explanation = `**Confidence: ${confidencePct}%** (${verified.classification})\n\n`

        if (verified.evidence.length > 0) {
            explanation += `**Evidence:**\n`
            verified.evidence.forEach((e, i) => {
                explanation += `${i + 1}. [${e.type}] ${e.source}\n`
            })
        } else {
            explanation += `**No evidence provided** - This is an assumption.\n`
        }

        if (verified.contradictions && verified.contradictions.length > 0) {
            explanation += `\n⚠️ **Contradictions found:**\n`
            verified.contradictions.forEach(c => {
                explanation += `- ${c}\n`
            })
        }

        if (this.shouldRefuse(verified)) {
            explanation += `\n🚫 **Refusing to answer** - Confidence too low (< ${this.minEvidenceThreshold * 100}%)\n`
        }

        return explanation
    }
}

export const truthEngine = new TruthEngine()
