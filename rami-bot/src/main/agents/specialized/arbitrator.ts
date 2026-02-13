import { BaseAgent } from '../base-agent'
import { Agent, AgentRole } from '../types'
import { settingsManager } from '../../settings'

/**
 * Arbitrator Agent
 * Judges between competing solutions from other agents
 */

export class ArbitratorAgent extends BaseAgent implements Agent {
    constructor() {
        super(
            'arbitrator',
            'The Judge',
            'orchestrator',
            ['decision-making', 'evaluation', 'conflict-resolution']
        )
    }

    async process(message: string, context?: any): Promise<string> {
        // Parse debate context
        const { proposals, criteria } = context || {}

        if (!proposals || proposals.length < 2) {
            return 'Arbitration requires at least 2 proposals to evaluate.'
        }

        const systemPrompt = `You are The Judge, an impartial arbitrator for multi-agent systems.

Your role:
- Evaluate competing proposals objectively
- Consider: feasibility, risk, performance, maintainability
- Pick the winning approach with clear justification
- Detect contradictions or conflicts in reasoning

Be decisive but fair.`

        const userPrompt = `## Evaluate These Proposals:

${proposals.map((p: any, i: number) => `
### Proposal ${i + 1} (by ${p.agent})
${p.content}
`).join('\n')}

${criteria ? `## Decision Criteria:\n${criteria}` : ''}

**Your task**: Pick the best proposal and explain why. Format:
- Winner: [Proposal number]
- Reasoning: [Why this wins]
- Risks: [Potential issues to watch]
`

        const finalSystemPrompt = context?.systemPrompt
            ? `${context.systemPrompt}\n\n### ⚖️ JUDICIAL DOCTRINE:\n${systemPrompt}`
            : systemPrompt

        return await this.callLLM(finalSystemPrompt, userPrompt)
    }
}
