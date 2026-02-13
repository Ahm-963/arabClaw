import { appEvents } from '../events'

/**
 * QA Scorer
 * Evaluates agent outputs for accuracy, safety, and usefulness
 */

export interface QAScore {
    outputId: string
    timestamp: number
    accuracy: number // 0-1
    safety: number // 0-1
    usefulness: number // 0-1
    overall: number // Average
    feedback?: string
    scoredBy: 'user' | 'automated' | 'llm'
}

export interface ScoringCriteria {
    taskCompleted: boolean
    testsPass: boolean
    buildSuccess: boolean
    policyViolations: number
}

export class QAScorer {
    private scores: Map<string, QAScore> = new Map()

    constructor() {
        this.initializeEventListeners()
    }

    private initializeEventListeners(): void {
        appEvents.on('org:task_completed', async ({ task, success }) => {
            await this.scoreOutput(task.id, {
                taskCompleted: success,
                testsPass: success, // Heuristic: if task succeeded, tests are assumed to pass
                buildSuccess: success,
                policyViolations: 0
            })
        })
    }

    /**
     * Score an output based on automated checks
     */
    async scoreOutput(outputId: string, criteria: ScoringCriteria): Promise<QAScore> {
        const score: QAScore = {
            outputId,
            timestamp: Date.now(),
            accuracy: this.calculateAccuracy(criteria),
            safety: this.calculateSafety(criteria),
            usefulness: this.calculateUsefulness(criteria),
            overall: 0,
            scoredBy: 'automated'
        }

        score.overall = (score.accuracy + score.safety + score.usefulness) / 3

        this.scores.set(outputId, score)
        appEvents.emit('qa:score_recorded', score)

        console.log(`[QAScorer] Scored output ${outputId}: ${Math.round(score.overall * 100)}%`)

        return score
    }

    /**
     * Record user feedback
     */
    async recordUserFeedback(outputId: string, thumbsUp: boolean, feedback?: string): Promise<QAScore> {
        const score: QAScore = {
            outputId,
            timestamp: Date.now(),
            accuracy: thumbsUp ? 1 : 0,
            safety: thumbsUp ? 1 : 0,
            usefulness: thumbsUp ? 1 : 0,
            overall: thumbsUp ? 1 : 0,
            feedback,
            scoredBy: 'user'
        }

        this.scores.set(outputId, score)
        appEvents.emit('qa:user_feedback', score)

        return score
    }

    /**
     * Calculate accuracy score
     */
    private calculateAccuracy(criteria: ScoringCriteria): number {
        let score = 0

        if (criteria.taskCompleted) score += 0.4
        if (criteria.testsPass) score += 0.3
        if (criteria.buildSuccess) score += 0.3

        return Math.min(1, score)
    }

    /**
     * Calculate safety score
     */
    private calculateSafety(criteria: ScoringCriteria): number {
        // Penalize for policy violations
        const violations = criteria.policyViolations
        if (violations === 0) return 1
        if (violations <= 2) return 0.7
        if (violations <= 5) return 0.4
        return 0
    }

    /**
     * Calculate usefulness score
     */
    private calculateUsefulness(criteria: ScoringCriteria): number {
        // For now, based on task completion
        return criteria.taskCompleted ? 1 : 0.5
    }

    /**
     * Get average score for an agent
     */
    getAgentAverageScore(agentId: string): number {
        const agentScores = Array.from(this.scores.values())
            .filter(s => s.outputId.includes(agentId))

        if (agentScores.length === 0) return 0

        const sum = agentScores.reduce((acc, s) => acc + s.overall, 0)
        return sum / agentScores.length
    }

    /**
     * Get recent low scores (potential failures)
     */
    getRecentFailures(threshold: number = 0.5, limit: number = 10): QAScore[] {
        return Array.from(this.scores.values())
            .filter(s => s.overall < threshold)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
    }

    /**
     * Get overall metrics for the dashboard
     */
    getMetrics() {
        const scores = Array.from(this.scores.values())
        const totalScores = scores.length

        if (totalScores === 0) {
            return {
                averageQAScore: 0,
                totalScores: 0,
                recentFailures: 0,
                failureDetails: []
            }
        }

        const sum = scores.reduce((acc, s) => acc + s.overall, 0)
        const failures = this.getRecentFailures(0.5, 10)

        return {
            averageQAScore: sum / totalScores,
            totalScores,
            recentFailures: failures.length,
            failureDetails: failures.map(f => ({
                id: f.outputId,
                score: f.overall,
                timestamp: f.timestamp
            }))
        }
    }
}

export const qaScorer = new QAScorer()
