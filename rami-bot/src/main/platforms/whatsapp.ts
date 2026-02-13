import { appEvents } from '../events'

// WhatsApp Web.js integration
// Note: Requires whatsapp-web.js package

interface StoredMessage {
  id: string
  chatId: string
  text: string
  sender: 'user' | 'bot'
  timestamp: number
  platform: 'whatsapp'
}

type MessageProcessor = (message: string, chatId: string, platform: string) => Promise<string>

export class WhatsAppBot {
  private client: any = null
  private status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'error' = 'disconnected'
  private messages: Map<string, StoredMessage[]> = new Map()
  private messageProcessor: MessageProcessor | null = null
  private qrCode: string | null = null

  constructor() {}

  setMessageProcessor(processor: MessageProcessor): void {
    this.messageProcessor = processor
  }

  async start(): Promise<void> {
    try {
      this.updateStatus('connecting')

      // Dynamic import to avoid errors if package not installed
      const { Client, LocalAuth } = await import('whatsapp-web.js')

      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      })

      this.client.on('qr', (qr: string) => {
        console.log('[WhatsApp] QR Code received')
        this.qrCode = qr
        this.updateStatus('qr_ready')
        appEvents.emit('whatsapp:qr', qr)
      })

      this.client.on('ready', () => {
        console.log('[WhatsApp] Client is ready!')
        this.qrCode = null
        this.updateStatus('connected')
      })

      this.client.on('authenticated', () => {
        console.log('[WhatsApp] Authenticated')
      })

      this.client.on('auth_failure', (msg: string) => {
        console.error('[WhatsApp] Auth failure:', msg)
        this.updateStatus('error')
      })

      this.client.on('disconnected', (reason: string) => {
        console.log('[WhatsApp] Disconnected:', reason)
        this.updateStatus('disconnected')
      })

      this.client.on('message', async (msg: any) => {
        await this.handleMessage(msg)
      })

      await this.client.initialize()

    } catch (error: any) {
      console.error('[WhatsApp] Failed to start:', error.message)
      this.updateStatus('error')
      
      if (error.code === 'MODULE_NOT_FOUND') {
        console.log('[WhatsApp] Please install whatsapp-web.js: npm install whatsapp-web.js')
      }
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy()
      } catch (e) {}
      this.client = null
    }
    this.updateStatus('disconnected')
  }

  private updateStatus(status: typeof this.status): void {
    this.status = status
    appEvents.emit('whatsapp:status', status)
  }

  getStatus(): string {
    return this.status
  }

  getQRCode(): string | null {
    return this.qrCode
  }

  private async handleMessage(msg: any): Promise<void> {
    // Ignore messages from self
    if (msg.fromMe) return

    const chatId = msg.from
    const text = msg.body

    if (!text) return

    // Store user message
    const userMessage: StoredMessage = {
      id: `wa_${msg.id._serialized}`,
      chatId,
      text,
      sender: 'user',
      timestamp: msg.timestamp * 1000,
      platform: 'whatsapp'
    }

    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, [])
    }
    this.messages.get(chatId)!.push(userMessage)
    appEvents.emitNewMessage(userMessage)

    // Process with AI
    if (this.messageProcessor && this.client) {
      try {
        console.log(`[WhatsApp] Message from ${chatId}: ${text.substring(0, 50)}...`)

        // Send typing indicator
        const chat = await msg.getChat()
        await chat.sendStateTyping()

        const response = await this.messageProcessor(text, chatId, 'whatsapp')

        if (response) {
          await this.sendMessage(chatId, response)
        }

      } catch (error: any) {
        console.error('[WhatsApp] Process error:', error.message)
        try {
          await this.client.sendMessage(chatId, `❌ Error: ${error.message}`)
        } catch (e) {}
      }
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.client) return

    try {
      await this.client.sendMessage(chatId, text)

      // Store bot message
      const botMessage: StoredMessage = {
        id: `wa_bot_${Date.now()}`,
        chatId,
        text,
        sender: 'bot',
        timestamp: Date.now(),
        platform: 'whatsapp'
      }

      if (!this.messages.has(chatId)) {
        this.messages.set(chatId, [])
      }
      this.messages.get(chatId)!.push(botMessage)
      appEvents.emitNewMessage(botMessage)

    } catch (error: any) {
      console.error('[WhatsApp] Send error:', error.message)
    }
  }

  async sendImage(chatId: string, imagePath: string, caption?: string): Promise<void> {
    if (!this.client) return

    try {
      const { MessageMedia } = await import('whatsapp-web.js')
      const media = MessageMedia.fromFilePath(imagePath)
      await this.client.sendMessage(chatId, media, { caption })
    } catch (error: any) {
      console.error('[WhatsApp] Image error:', error.message)
    }
  }

  async sendDocument(chatId: string, docPath: string, filename?: string): Promise<void> {
    if (!this.client) return

    try {
      const { MessageMedia } = await import('whatsapp-web.js')
      const media = MessageMedia.fromFilePath(docPath)
      await this.client.sendMessage(chatId, media, { sendMediaAsDocument: true, filename })
    } catch (error: any) {
      console.error('[WhatsApp] Document error:', error.message)
    }
  }

  getMessages(chatId: string): StoredMessage[] {
    return this.messages.get(chatId) || []
  }

  clearMessages(chatId: string): void {
    this.messages.delete(chatId)
  }
}

export const whatsappBot = new WhatsAppBot()
