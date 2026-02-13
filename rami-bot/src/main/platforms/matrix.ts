import { appEvents } from '../events'
import nodeFetch from 'node-fetch'

/**
 * Matrix Integration
 * Primarily via Client-Server API (REST)
 */

interface StoredMessage {
    id: string
    chatId: string
    text: string
    sender: 'user' | 'bot'
    timestamp: number
    platform: 'matrix'
}

type MessageProcessor = (message: string, chatId: string, platform: string) => Promise<string>

export class MatrixBot {
    private status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected'
    private messageProcessor: MessageProcessor | null = null
    private homeserver: string = ''
    private accessToken: string = ''
    private userId: string = ''
    private lastBatch: string = ''
    private pollInterval: NodeJS.Timeout | null = null

    constructor() { }

    setMessageProcessor(processor: MessageProcessor): void {
        this.messageProcessor = processor
    }

    async start(config: { homeserver: string; accessToken: string; userId: string }): Promise<void> {
        this.homeserver = config.homeserver.endsWith('/') ? config.homeserver.slice(0, -1) : config.homeserver
        this.accessToken = config.accessToken
        this.userId = config.userId

        this.updateStatus('connecting')

        try {
            // Test credentials
            const res = await nodeFetch(`${this.homeserver}/_matrix/client/v3/account/whoami`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            })

            if (!res.ok) {
                throw new Error(`Matrix auth failed: ${res.statusText}`)
            }

            this.updateStatus('connected')
            console.log('[Matrix] Connected as', this.userId)

            // Start long-polling
            this.startPolling()

        } catch (error: any) {
            console.error('[Matrix] Failed to start:', error.message)
            this.updateStatus('error')
        }
    }

    private startPolling(): void {
        if (this.pollInterval) return

        const poll = async () => {
            try {
                const url = `${this.homeserver}/_matrix/client/v3/sync?timeout=30000${this.lastBatch ? `&since=${this.lastBatch}` : ''}`
                const res = await nodeFetch(url, {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                })

                if (!res.ok) throw new Error(`Sync failed: ${res.statusText}`)

                const data: any = await res.json()
                this.lastBatch = data.next_batch

                // Process incoming events
                if (data.rooms?.join) {
                    for (const [roomId, room] of Object.entries(data.rooms.join) as any) {
                        if (room.timeline?.events) {
                            for (const event of room.timeline.events) {
                                if (event.type === 'm.room.message' && event.sender !== this.userId) {
                                    await this.handleMessage(roomId, event)
                                }
                            }
                        }
                    }
                }

            } catch (error: any) {
                console.error('[Matrix] Sync error:', error.message)
                // Backoff on error
                await new Promise(resolve => setTimeout(resolve, 5000))
            }

            if (this.status === 'connected') {
                this.pollInterval = setTimeout(poll, 0) as any
            }
        }

        poll()
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearTimeout(this.pollInterval)
            this.pollInterval = null
        }
        this.updateStatus('disconnected')
    }

    private async handleMessage(roomId: string, event: any): Promise<void> {
        const text = event.content?.body
        if (!text) return

        // Store user message
        const userMessage: StoredMessage = {
            id: `mtx_${event.event_id}`,
            chatId: roomId,
            text,
            sender: 'user',
            timestamp: event.origin_server_ts || Date.now(),
            platform: 'matrix'
        }

        appEvents.emitNewMessage(userMessage)

        // Process with AI
        if (this.messageProcessor) {
            try {
                console.log(`[Matrix] Message from ${roomId}: ${text.substring(0, 50)}...`)
                const response = await this.messageProcessor(text, roomId, 'matrix')

                if (response) {
                    await this.sendMessage(roomId, response)
                }
            } catch (error: any) {
                console.error('[Matrix] Process error:', error.message)
            }
        }
    }

    async sendMessage(roomId: string, text: string): Promise<void> {
        try {
            const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            await nodeFetch(`${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    msgtype: 'm.text',
                    body: text
                })
            })

            // Store bot message
            const botMessage: StoredMessage = {
                id: `mtx_bot_${txnId}`,
                chatId: roomId,
                text,
                sender: 'bot',
                timestamp: Date.now(),
                platform: 'matrix'
            }

            appEvents.emitNewMessage(botMessage)

        } catch (error: any) {
            console.error('[Matrix] Send error:', error.message)
        }
    }

    private updateStatus(status: typeof this.status): void {
        this.status = status
        appEvents.emit('matrix:status', status)
    }

    getStatus(): string {
        return this.status
    }
}

export const matrixBot = new MatrixBot()
