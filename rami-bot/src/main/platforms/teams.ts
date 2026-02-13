import { appEvents } from '../events'
import nodeFetch from 'node-fetch'

/**
 * Microsoft Teams Integration
 * Uses Microsoft Graph API via Client Credentials flow
 */

interface StoredMessage {
    id: string
    chatId: string
    text: string
    sender: 'user' | 'bot'
    timestamp: number
    platform: 'teams'
}

type MessageProcessor = (message: string, chatId: string, platform: string) => Promise<string>

export class TeamsBot {
    private status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected'
    private messageProcessor: MessageProcessor | null = null
    private tenantId: string = ''
    private clientId: string = ''
    private clientSecret: string = ''
    private accessToken: string | null = null
    private tokenExpiry: number = 0
    private pollInterval: NodeJS.Timeout | null = null
    private lastSync: string = new Date().toISOString()

    constructor() { }

    setMessageProcessor(processor: MessageProcessor): void {
        this.messageProcessor = processor
    }

    private async refreshAccessToken(): Promise<void> {
        if (this.accessToken && Date.now() < this.tokenExpiry) return

        try {
            const params = new URLSearchParams()
            params.append('client_id', this.clientId)
            params.append('scope', 'https://graph.microsoft.com/.default')
            params.append('client_secret', this.clientSecret)
            params.append('grant_type', 'client_credentials')

            const res = await nodeFetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })

            if (!res.ok) throw new Error(`Teams auth failed: ${res.statusText}`)

            const data: any = await res.json()
            this.accessToken = data.access_token
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // 1 min buffer

        } catch (error: any) {
            console.error('[Teams] Auth error:', error.message)
            throw error
        }
    }

    async start(config: { tenantId: string; appId: string; appSecret: string }): Promise<void> {
        this.tenantId = config.tenantId
        this.clientId = config.appId
        this.clientSecret = config.appSecret

        this.updateStatus('connecting')

        try {
            await this.refreshAccessToken()
            this.updateStatus('connected')
            console.log('[Teams] Connected successfully')

            this.startPolling()

        } catch (error: any) {
            console.error('[Teams] Failed to start:', error.message)
            this.updateStatus('error')
        }
    }

    private startPolling(): void {
        if (this.pollInterval) return

        const poll = async () => {
            try {
                await this.refreshAccessToken()

                // Polling Graph API for new messages is expensive/complex (requires subscriptions/webhooks for real-time)
                // For a desktop bot, we can use Delta queries if supported or just poll recent messages
                // Here we'll simulate a simple poll of recent chat messages (requires Chat.Read.All)

                const res = await nodeFetch(`https://graph.microsoft.com/v1.0/me/chats/getAllMessages?$filter=lastModifiedDateTime gt ${this.lastSync}`, {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                })

                if (res.ok) {
                    const data: any = await res.json()
                    if (data.value) {
                        for (const msg of data.value) {
                            if (msg.from?.application?.id !== this.clientId) {
                                await this.handleMessage(msg)
                            }
                        }
                    }
                    this.lastSync = new Date().toISOString()
                }

            } catch (error: any) {
                console.error('[Teams] Poll error:', error.message)
            }

            if (this.status === 'connected') {
                this.pollInterval = setTimeout(poll, 10000) as any // Poll every 10s
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
        const text = msg.body?.content
        const chatId = msg.chatId || msg.channelIdentity?.channelId

        if (!text || !chatId) return

        const userMessage: StoredMessage = {
            id: `tms_${msg.id}`,
            chatId,
            text: text.replace(/<[^>]*>?/gm, ''), // Remove HTML tags
            sender: 'user',
            timestamp: new Date(msg.createdDateTime).getTime(),
            platform: 'teams'
        }

        appEvents.emitNewMessage(userMessage)

        if (this.messageProcessor) {
            try {
                const response = await this.messageProcessor(userMessage.text, chatId, 'teams')
                if (response) {
                    await this.sendMessage(chatId, response)
                }
            } catch (error: any) {
                console.error('[Teams] Process error:', error.message)
            }
        }
    }

    async sendMessage(chatId: string, text: string): Promise<void> {
        try {
            await this.refreshAccessToken()

            await nodeFetch(`https://graph.microsoft.com/v1.0/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: { content: text }
                })
            })

            const botMessage: StoredMessage = {
                id: `tms_bot_${Date.now()}`,
                chatId,
                text,
                sender: 'bot',
                timestamp: Date.now(),
                platform: 'teams'
            }

            appEvents.emitNewMessage(botMessage)

        } catch (error: any) {
            console.error('[Teams] Send error:', error.message)
        }
    }

    private updateStatus(status: typeof this.status): void {
        this.status = status
        appEvents.emit('teams:status', status)
    }

    getStatus(): string {
        return this.status
    }
}

export const teamsBot = new TeamsBot()
