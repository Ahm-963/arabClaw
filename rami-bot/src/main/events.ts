import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'

export interface Message {
  id: string
  chatId: string
  text: string
  sender: 'user' | 'bot'
  timestamp: number
  platform: string
  metadata?: Record<string, unknown>
}

export interface AgentActivity {
  type: 'thinking' | 'tool_use' | 'responding' | 'idle' | 'task_started' | 'task_completed' | 'collaboration_started' | 'collaboration_completed'
  toolName?: string
  details?: string
  agentId?: string
  taskId?: string
  collabId?: string
}

class AppEventEmitter extends EventEmitter {
  sendToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }

  emitNewMessage(message: Message): void {
    console.log('[Events] Emitting new message:', message.id)
    this.emit('message:new', message)
    this.sendToRenderer('message:new', message)
  }

  emitTelegramStatusChanged(status: string): void {
    console.log('[Events] Telegram status changed:', status)
    this.emit('telegram:status', status)
    this.sendToRenderer('telegram:status', status)
  }

  emitAgentActivity(activity: AgentActivity): void {
    console.log('[Events] Agent activity:', activity.type, activity.toolName || '')
    this.emit('agent:activity', activity)
    this.sendToRenderer('agent:activity', activity)
  }

  emitServiceStatusChanged(serviceId: string, status: string): void {
    console.log('[Events] Service status:', serviceId, status)
    this.emit('service:status', { serviceId, status })
    this.sendToRenderer('service:status', { serviceId, status })
  }

  emitOrgStatus(running: boolean): void {
    console.log('[Events] Org status changed:', running)
    this.emit('org:status', { running })
    this.sendToRenderer('org:status', { running })
  }
}

export const appEvents = new AppEventEmitter()
