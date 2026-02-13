import { Agent, AgentMessage } from './types'

export class AgentRegistry {
    private agents: Map<string, Agent> = new Map()

    register(agent: Agent) {
        if (this.agents.has(agent.id)) {
            console.warn(`Agent ${agent.id} already registered. Overwriting.`)
        }
        this.agents.set(agent.id, agent)
    }

    get(id: string): Agent | undefined {
        return this.agents.get(id)
    }

    getAll(): Agent[] {
        return Array.from(this.agents.values())
    }

    getAgentsByRole(role: string): Agent[] {
        return this.getAll().filter(a => a.role === role)
    }
}

export const agentRegistry = new AgentRegistry()
