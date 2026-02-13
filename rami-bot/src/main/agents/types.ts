export interface Agent {
    id: string
    name: string
    role: AgentRole
    capabilities: string[]
    process(message: string, context?: any): Promise<string>
}

export type AgentRole = 'orchestrator' | 'coder' | 'researcher' | 'reviewer' | 'debugger' | 'arbitrator' | 'assistant' | 'writer' | 'social' | string

export interface AgentMessage {
    from: string
    to: string
    content: string
    contextId?: string
    timestamp: number
}
