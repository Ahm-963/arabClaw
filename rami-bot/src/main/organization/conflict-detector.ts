import { appEvents } from '../events'
import { ensembleManager, EnsembleVote } from './ensemble-manager'

/**
 * Conflict Detector
 * Explains why agents disagree on decisions
 */

export interface Conflict {
    task: string
    agents: string[]
    reason: string
    severity: 'low' | 'medium' | 'high'
}

export class ConflictDetector {
    private readonly SIMILARITY_THRESHOLD = 0.5

    /**
     * Detect conflicts in ensemble votes
     */
    async detectConflicts(task: string, votes: EnsembleVote[]): Promise<Conflict[]> {
        const conflicts: Conflict[] = []

        if (votes.length < 2) return conflicts

        // Compare votes pairwise
        for (let i = 0; i < votes.length; i++) {
            for (let j = i + 1; j < votes.length; j++) {
                const vote1 = votes[i]
                const vote2 = votes[j]

                const similarity = this.calculateSimilarity(vote1.answer, vote2.answer)

                if (similarity < this.SIMILARITY_THRESHOLD) {
                    const conflict = await this.explainConflict(task, vote1, vote2)
                    conflicts.push(conflict)

                    // Broadcast to synergy system
                    appEvents.emit('org:conflict_detected', conflict)
                }
            }
        }

        return conflicts
    }

    /**
     * Calculate similarity between two answers
     */
    private calculateSimilarity(answer1: string, answer2: string): number {
        const a1 = answer1.toLowerCase().trim()
        const a2 = answer2.toLowerCase().trim()

        // Simple Jaccard similarity on words
        const words1 = new Set(a1.split(/\s+/))
        const words2 = new Set(a2.split(/\s+/))

        const intersection = new Set([...words1].filter(x => words2.has(x)))
        const union = new Set([...words1, ...words2])

        return intersection.size / union.size
    }

    /**
     * Explain why two agents disagree
     */
    private async explainConflict(task: string, vote1: EnsembleVote, vote2: EnsembleVote): Promise<Conflict> {
        // Generate explanation based on differences
        const reason = this.generateExplanation(vote1, vote2)

        return {
            task,
            agents: [vote1.agent, vote2.agent],
            reason,
            severity: this.assessSeverity(vote1, vote2)
        }
    }

    /**
     * Generate human-readable explanation
     */
    private generateExplanation(vote1: EnsembleVote, vote2: EnsembleVote): string {
        return `${vote1.agent} suggests "${vote1.answer.substring(0, 50)}..." while ${vote2.agent} suggests "${vote2.answer.substring(0, 50)}...". Their approaches appear to differ fundamentally.`
    }

    /**
     * Assess conflict severity
     */
    private assessSeverity(vote1: EnsembleVote, vote2: EnsembleVote): 'low' | 'medium' | 'high' {
        // If both have low confidence, it's understandable
        if (vote1.confidence < 0.5 && vote2.confidence < 0.5) {
            return 'low'
        }

        // If both are highly confident but disagree, it's serious
        if (vote1.confidence > 0.8 && vote2.confidence > 0.8) {
            return 'high'
        }

        return 'medium'
    }
}

export const conflictDetector = new ConflictDetector()
