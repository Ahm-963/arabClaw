import { BaseAgent } from '../base-agent'
import { truthEngine, Evidence } from '../../organization/truth-engine'

const RESEARCHER_PROMPT = `
You are the **Intelligence Scout** 🔍, the Lead Research specialist of the Arabclaw Swarm.
Your mission is to perform deep-web reconnaissance, document synthesis, and factual triangulation with an elite, analytical, yet humanized persona.

### �️ RESEARCH DOCTRINE:
- **Information Triangulation**: Never rely on a single source. Cross-reference data between technical documentation, news, and community forums.
- **Strategic Synthesis**: Do not just dump data. Construct a narrative. (e.g., "The market is shifting towards X because of Y; our strategy should be Z.")
- **Truth Protocol**: Every claim must be verified by the Swarm's Truth Engine. 
- **Sophisticated Reporting**: Use clear hierarchy, professional formatting, and an 'Intelligence Summary'.

### 📜 COMMUNICATION PROTOCOL:
- **Tone**: Intellectual, thorough, and highly articulate.
- **Contextual Insights**: Explain WHY a piece of information matters to the mission.
- **Humanized Technicality**: Make complex data digestible without losing technical depth.
- **Clarity**: Use bullet points and bold text to highlight critical "Intelligence Nuggets".
`

export class ResearcherAgent extends BaseAgent {
    constructor() {
        super('researcher-main', 'Researcher', 'researcher', ['web-search', 'synthesis'])
    }

    async process(message: string, context?: any): Promise<string> {
        const systemPrompt = context?.systemPrompt
            ? `${context.systemPrompt}\n\n### 🔍 RESEARCH LAYER (CORE DOCTRINE):\n${RESEARCHER_PROMPT}`
            : RESEARCHER_PROMPT

        const rawResponse = await this.callLLM(systemPrompt, message, context?.preferredProvider)

        // Extract claims and sources from response
        const evidence = this.extractEvidence(rawResponse)

        if (evidence.length === 0) {
            return rawResponse + '\n\n⚠️ **No citations provided** - This response is unverified.'
        }

        // Verify claims using Truth Engine
        const verificationResults = []
        for (const claim of this.extractClaims(rawResponse)) {
            const verified = await truthEngine.verifyClaim(claim, evidence)
            verificationResults.push(verified)
        }

        // Add confidence footer
        const avgConfidence = verificationResults.reduce((sum, v) => sum + v.confidence, 0) / verificationResults.length
        const confidencePct = Math.round((avgConfidence || 0) * 100)

        return rawResponse + `\n\n---\n📊 **Verification**: ${confidencePct}% confidence (${evidence.length} source${evidence.length > 1 ? 's' : ''})`
    }

    private extractEvidence(response: string): Evidence[] {
        const evidence: Evidence[] = []
        const urlRegex = /https?:\/\/[^\s]+/g
        const urls = response.match(urlRegex) || []

        for (const url of urls) {
            evidence.push({
                source: url,
                type: 'web',
                content: response,
                reliability: 0.7, // Default web reliability
                timestamp: Date.now()
            })
        }

        return evidence
    }

    private extractClaims(response: string): string[] {
        // Simple heuristic: sentences ending with periods
        const sentences = response.split(/[.!?]/).filter(s => s.trim().length > 10)
        return sentences.slice(0, 3) // Top 3 claims
    }
}
