import { BaseAgent } from './base-agent'
import { AgentRole } from './types'

export class DynamicAgent extends BaseAgent {
    private systemPrompt: string

    constructor(id: string, name: string, role: string, systemPrompt: string, capabilities: string[]) {
        // Cast role to AgentRole to satisfy TS, or we need to update AgentRole to allow strings
        // For now, we'll try to keep it compatible or assume AgentRole is updated to allow string
        super(id, name, role as AgentRole, capabilities)
        this.systemPrompt = systemPrompt
    }

    async process(message: string, context?: any): Promise<string> {
        return this.callLLM(this.systemPrompt, message, context?.preferredProvider)
    }
}
