import { Task, OrgAgent } from './synergy-manager'
import { settingsManager } from '../settings'

export interface Bid {
    agentId: string
    tokenEstimate: number
    confidence: number
    reasoning: string
}

/**
 * Resource Optimizer
 * Implements Game Theory (Cooperative/Competitive Bidding) for task allocation.
 */
export class ResourceOptimizer {
    /**
     * Negotiate the best model for a task based on priority and complexity
     */
    public async negotiateProvider(task: Task): Promise<string> {
        const settings = settingsManager.getSettingsSync()
        const enabledConfigs = settingsManager.getEnabledConfigs()

        // 1. If we have custom configs, check for a "Specialist" match
        if (enabledConfigs.length > 1) {
            const specialist = enabledConfigs.find(c =>
                task.requiredSkills.some(skill => c.name.toLowerCase().includes(skill.toLowerCase()))
            )
            if (specialist) return specialist.id
        }

        // 2. High Priority -> Prefer Claude if available
        if (task.priority === 'critical' || task.priority === 'high') {
            const bestClaude = enabledConfigs.find(c => c.provider === 'claude')
            if (bestClaude) return bestClaude.id
            if (settings.claudeApiKey) return 'claude'
        }

        // 3. Multi-skill -> Prefer OpenAI if available
        if (task.requiredSkills.length > 3) {
            const bestOpenAI = enabledConfigs.find(c => c.provider === 'openai')
            if (bestOpenAI) return bestOpenAI.id
            if (settings.openaiApiKey) return 'openai'
        }

        // 4. Fallback to current primary provider
        return settings.llmProvider || 'claude'
    }

    /**
     * Conduct a "bidding round" among eligible agents for a project
     * (Simulated Game Theory Bidding)
     */
    public conductBidding(task: Task, candidates: OrgAgent[]): Bid[] {
        return candidates.map(agent => {
            const matchedSkills = task.requiredSkills.filter(req =>
                agent.skills.some(s => s.toLowerCase().includes(req.toLowerCase()))
            )
            const skillMatchScore = matchedSkills.length / (task.requiredSkills.length || 1)

            return {
                agentId: agent.id,
                tokenEstimate: this.calculateEstimatedTokens(task, agent),
                confidence: (agent.successRate / 100) * (0.5 + 0.5 * skillMatchScore),
                reasoning: `Matched ${matchedSkills.length}/${task.requiredSkills.length} skills. Skill match: ${Math.round(skillMatchScore * 100)}%.`
            }
        })
    }

    private calculateEstimatedTokens(task: Task, agent: OrgAgent): number {
        const base = 500
        const complexity = (task.description.length / 100) * 200
        const proficiencyBonus = (100 - agent.successRate) * 5 // Less proficient agents use more tokens thinking
        return Math.floor(base + complexity + proficiencyBonus)
    }

    /**
     * Determine the optimal winner of a bid
     */
    public determineWinner(bids: Bid[]): Bid | null {
        if (bids.length === 0) return null

        // Winner = Highest (Confidence / TokenEstimate) -> Value-to-Cost ROI
        return bids.reduce((prev, curr) => {
            const prevROI = prev.confidence / prev.tokenEstimate
            const currROI = curr.confidence / curr.tokenEstimate
            return currROI > prevROI ? curr : prev
        })
    }
}

export const resourceOptimizer = new ResourceOptimizer()
