import { appEvents } from '../events'
import nodeFetch from 'node-fetch'

/**
 * iMessage Integration (via BlueBubbles)
 * Interfaces with BlueBubbles Private API
 */

interface StoredMessage {
    id: string
    chatId: string
    text: string
    sender: 'user' | 'bot'
    timestamp: number
    platform: 'imessage'
}

type MessageProcessor = (message: string, chatId: string, platform: string) => Promise<string>

export class IMessageBot {
    private status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected'
    private messageProcessor: MessageProcessor | null = null
    private serverUrl: string = ''
    private password: string = ''
    private pollInterval: NodeJS.Timeout | null = null
    private lastMessageGuid: string | null = null

    constructor() { }

    setMessageProcessor(processor: MessageProcessor): void {
        this.messageProcessor = processor
    }

    async start(config: { url: string; password: string }): Promise<void> {
        this.serverUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url
        this.password = config.password

        this.updateStatus('connecting')

        try {
            // Test server connection
            const res = await nodeFetch(`${this.serverUrl}/api/v1/server/info?password=${encodeURIComponent(this.password)}`)

            if (!res.ok) {
                throw new Error(`BlueBubbles connection failed: ${res.statusText}`)
            }

            this.updateStatus('connected')
            console.log('[iMessage] Connected to BlueBubbles server')

            this.startPolling()

        } catch (error: any) {
            console.error('[iMessage] Failed to start:', error.message)
            this.updateStatus('error')
        }
    }

    private startPolling(): void {
        if (this.pollInterval) return

        const poll = async () => {
            try {
                // Fetch recent messages
                const res = await nodeFetch(`${this.serverUrl}/api/v1/message?password=${encodeURIComponent(this.password)}&limit=10&sort=DESC`)

                if (res.ok) {
                    const data: any = await res.json()
                    const messages = data.data || []

                    if (messages.length > 0) {
                        // Find new messages since last poll
                        const newIndex = messages.findIndex((m: any) => m.guid === this.lastMessageGuid)
                        const newMessages = newIndex === -1 ? messages : messages.slice(0, newIndex)

                        for (const msg of newMessages.reverse()) {
                            if (!msg.isFromMe) {
                                await this.handleMessage(msg)
                            }
                        }

                        this.lastMessageGuid = messages[0].guid
                    }
                }
            } catch (error: any) {
                console.error('[iMessage] Poll error:', error.message)
            }

            if (this.status === 'connected') {
                this.pollInterval = setTimeout(poll, 5000) as any // Poll every 5s
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

    private async handleMessage(msg: any): Promise<void> {
        const text = msg.text
        const chatId = msg.handle?.address || msg.chatGuid

        if (!text || !chatId) return

        const userMessage: StoredMessage = {
            id: `imsg_${msg.guid}`,
            chatId,
            text,
            sender: 'user',
            timestamp: msg.dateCreated,
            platform: 'imessage'
        }

        appEvents.emitNewMessage(userMessage)

        if (this.messageProcessor) {
            try {
                const response = await this.messageProcessor(text, chatId, 'imessage')
                if (response) {
                    await this.sendMessage(chatId, response)
                }
            } catch (error: any) {
                console.error('[iMessage] Process error:', error.message)
            }
        }
    }

    async sendMessage(chatId: string, text: string): Promise<void> {
        try {
            await nodeFetch(`${this.serverUrl}/api/v1/message/text?password=${encodeURIComponent(this.password)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatGuid: chatId.includes(';') ? chatId : `iMessage;-;${chatId}`,
                    message: text
                })
            })

            const botMessage: StoredMessage = {
                id: `imsg_bot_${Date.now()}`,
                chatId,
                text,
                sender: 'bot',
                timestamp: Date.now(),
                platform: 'imessage'
            }

            appEvents.emitNewMessage(botMessage)

        } catch (error: any) {
            console.error('[iMessage] Send error:', error.message)
        }
    }

    private updateStatus(status: typeof this.status): void {
        this.status = status
        appEvents.emit('imessage:status', status)
    }

    getStatus(): string {
        return this.status
    }
}

export const imessageBot = new IMessageBot()
