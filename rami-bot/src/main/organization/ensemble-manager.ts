import { synergyManager } from '../organization/synergy-manager'
import { agentRegistry } from '../agents/registry'

/**
 * Ensemble Manager
 * Requires multiple agents to agree on high-stakes decisions
 */

export interface EnsembleVote {
    agent: string
    answer: string
    confidence: number
    reasoning?: string
}

export interface EnsembleResult {
    consensus: boolean
    votes: EnsembleVote[]
    winner?: string
    agreementScore: number
}

export class EnsembleManager {
    private readonly MIN_AGENTS = 3
    private readonly CONSENSUS_THRESHOLD = 0.6 // 60% must agree

    /**
     * Run ensemble check with multiple agents
     */
    async ensembleCheck(task: string, agentIds?: string[], minAgents: number = this.MIN_AGENTS): Promise<EnsembleResult> {
        // Get agents to participate
        const agents = agentIds || await this.selectAgents(minAgents)

        if (agents.length < minAgents) {
            console.warn(`[Ensemble] Not enough agents (${agents.length} < ${minAgents})`)
            return {
                consensus: false,
                votes: [],
                agreementScore: 0
            }
        }

        // Collect votes from each agent
        const votes: EnsembleVote[] = []

        for (const agentId of agents) {
            try {
                const vote = await this.getAgentVote(agentId, task)
                votes.push(vote)
            } catch (error: any) {
                console.error(`[Ensemble] Agent ${agentId} failed:`, error.message)
            }
        }

        // Analyze results
        return this.analyzeVotes(votes)
    }

    /**
     * Get a single agent's vote
     */
    private async getAgentVote(agentId: string, task: string): Promise<EnsembleVote> {
        const agent = agentRegistry.get(agentId)
        if (!agent) {
            throw new Error(`Agent ${agentId} not found in registry`)
        }

        const response = await agent.process(`VOTE: ${task}`, { mode: 'ensemble' })

        return {
            agent: agentId,
            answer: response,
            confidence: 0.9,
            reasoning: 'Executed via ensemble check'
        }
    }

    /**
     * Analyze votes and determine consensus
     */
    private analyzeVotes(votes: EnsembleVote[]): EnsembleResult {
        if (votes.length === 0) {
            return {
                consensus: false,
                votes: [],
                agreementScore: 0
            }
        }

        // Group by answer (simplified - exact match)
        const groups = new Map<string, EnsembleVote[]>()

        for (const vote of votes) {
            const normalized = vote.answer.toLowerCase().trim()
            if (!groups.has(normalized)) {
                groups.set(normalized, [])
            }
            groups.get(normalized)!.push(vote)
        }

        // Find majority
        let maxGroup: EnsembleVote[] = []
        for (const group of groups.values()) {
            if (group.length > maxGroup.length) {
                maxGroup = group
            }
        }

        const agreementScore = maxGroup.length / votes.length
        const consensus = agreementScore >= this.CONSENSUS_THRESHOLD

        return {
            consensus,
            votes,
            winner: consensus ? maxGroup[0].answer : undefined,
            agreementScore
        }
    }

    /**
     * Select agents for ensemble
     */
    private async selectAgents(count: number): Promise<string[]> {
        const dashboard = await synergyManager.getDashboard()
        const availableAgents = dashboard.agents
            .filter((a: any) => a.status === 'idle')
            .map((a: any) => a.id)

        return availableAgents.slice(0, count)
    }
}

export const ensembleManager = new EnsembleManager()
