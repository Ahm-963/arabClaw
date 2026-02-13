import { EventEmitter } from 'events'
import { AgentMessage } from './types'

export class MessageBus extends EventEmitter {
    private history: AgentMessage[] = []

    publish(message: AgentMessage) {
        this.history.push(message)
        this.emit('message', message)

        // Also emit specific topic based on target
        this.emit(`to:${message.to}`, message)
    }

    subscribe(agentId: string, callback: (message: AgentMessage) => void) {
        this.on(`to:${agentId}`, callback)
    }

    getHistory(): AgentMessage[] {
        return this.history
    }

    getAgentHistory(agentId: string): AgentMessage[] {
        return this.history.filter(m => m.from === agentId || m.to === agentId)
    }
}

export const messageBus = new MessageBus()
