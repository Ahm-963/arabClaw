import { Task } from '../organization/synergy-manager'
import { OrgAgent } from '../organization/synergy-manager'

export interface Bid {
    agentId: string
    score: number
    costEstimate: number
    etaMinutes: number
}

/**
 * ResourceOptimizer: Uses Game Theory principles to optimize task allocation.
 * Maximizes Value-to-Cost ROI for LLM resource usage.
 */
export class ResourceOptimizer {
    private modelCosts: Record<string, number> = {
        'claude-3-5-sonnet': 3,
        'gpt-4o': 10,
        'gemini-1.5-pro': 1,
        'gpt-3.5-turbo': 0.5
    }

    /**
     * Conducts a bidding round for a task among eligible agents
     */
    conductBidding(task: Task, candidates: OrgAgent[]): Bid[] {
        return candidates.map(agent => ({
            agentId: agent.id,
            score: agent.successRate,
            costEstimate: this.calculateCost(agent, task),
            etaMinutes: this.estimateTime(agent, task)
        }))
    }

    /**
     * Determines the winner based on best ROI (Score / Cost)
     */
    determineWinner(bids: Bid[]): Bid | null {
        if (bids.length === 0) return null

        return bids.reduce((best, current) => {
            const bestROI = best.score / (best.costEstimate || 1)
            const currentROI = current.score / (current.costEstimate || 1)
            return currentROI > bestROI ? current : best
        })
    }

    /**
     * Negotiates the best LLM provider for a specific task
     */
    async negotiateProvider(task: Task): Promise<string> {
        // Strategic selection:
        if (task.priority === 'critical') return 'claude-3-5-sonnet' // Reliability first
        if (task.requiredSkills.includes('coding')) return 'claude-3-5-sonnet'
        if (task.requiredSkills.includes('research')) return 'gpt-4o'

        return 'gemini-1.5-pro' // Cost-effective default
    }

    private calculateCost(agent: OrgAgent, task: Task): number {
        // Simplified cost calculation
        const baseCost = this.modelCosts['gemini-1.5-pro']
        return baseCost * (task.requiredSkills.length + 1)
    }

    private estimateTime(agent: OrgAgent, task: Task): number {
        return 5 + (task.requiredSkills.length * 2)
    }
}

export const resourceOptimizer = new ResourceOptimizer()
