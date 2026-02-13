import { qaScorer, QAScore } from './qa-scorer'

/**
 * Pattern Detector
 * Identifies repeated failure patterns to help agents learn
 */

export interface FailurePattern {
    id: string
    category: 'build' | 'test' | 'policy' | 'runtime'
    description: string
    occurrences: number
    firstSeen: number
    lastSeen: number
    affectedOutputs: string[]
}

export class PatternDetector {
    private patterns: Map<string, FailurePattern> = new Map()
    private readonly PATTERN_THRESHOLD = 3 // Detect after 3 occurrences

    /**
     * Analyze recent failures for patterns
     */
    async analyzeFailures(): Promise<FailurePattern[]> {
        const recentFailures = qaScorer.getRecentFailures(0.5, 50)

        // Group by error category
        const categories: Record<string, QAScore[]> = {
            build: [],
            test: [],
            policy: [],
            runtime: []
        }

        for (const failure of recentFailures) {
            const category = this.categorizeFailure(failure)
            categories[category].push(failure)
        }

        // Detect patterns in each category
        const detectedPatterns: FailurePattern[] = []

        for (const [category, failures] of Object.entries(categories)) {
            if (failures.length >= this.PATTERN_THRESHOLD) {
                const pattern = this.createPattern(category as any, failures)
                this.patterns.set(pattern.id, pattern)
                detectedPatterns.push(pattern)
            }
        }

        return detectedPatterns
    }

    /**
     * Categorize a failure
     */
    private categorizeFailure(score: QAScore): 'build' | 'test' | 'policy' | 'runtime' {
        if (!score.feedback) return 'runtime'

        const feedback = score.feedback.toLowerCase()

        if (feedback.includes('build') || feedback.includes('compile')) return 'build'
        if (feedback.includes('test')) return 'test'
        if (feedback.includes('policy') || feedback.includes('permission')) return 'policy'

        return 'runtime'
    }

    /**
     * Create a failure pattern
     */
    private createPattern(category: 'build' | 'test' | 'policy' | 'runtime', failures: QAScore[]): FailurePattern {
        const id = `pattern_${category}_${Date.now()}`

        return {
            id,
            category,
            description: `Repeated ${category} failures detected`,
            occurrences: failures.length,
            firstSeen: Math.min(...failures.map(f => f.timestamp)),
            lastSeen: Math.max(...failures.map(f => f.timestamp)),
            affectedOutputs: failures.map(f => f.outputId)
        }
    }

    /**
     * Get all detected patterns
     */
    getPatterns(): FailurePattern[] {
        return Array.from(this.patterns.values())
            .sort((a, b) => b.occurrences - a.occurrences)
    }

    /**
     * Check if a specific error type is a known pattern
     */
    isKnownPattern(category: string): boolean {
        return Array.from(this.patterns.values())
            .some(p => p.category === category && p.occurrences >= this.PATTERN_THRESHOLD)
    }
}

export const patternDetector = new PatternDetector()
