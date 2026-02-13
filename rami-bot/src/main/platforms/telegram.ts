import TelegramBotAPI from 'node-telegram-bot-api'
import { appEvents } from '../events'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

interface StoredMessage {
  id: string
  chatId: string
  text: string
  sender: 'user' | 'bot'
  timestamp: number
  platform: 'telegram'
}

type MessageProcessor = (message: string, chatId: string, platform: string) => Promise<string>

export class TelegramBot {
  private bot: TelegramBotAPI | null = null
  private token: string
  private status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected'
  private messages: Map<string, StoredMessage[]> = new Map()
  private messageProcessor: MessageProcessor | null = null
  private isProcessing: Set<string> = new Set()
  private lastStatusUpdate: number = 0
  private statusDebounceMs: number = 5000
  // Track God Mode state per chat
  private godModeChats: Set<string> = new Set()
  private synergyManager: any = null // Will be injected or passed

  constructor(token: string) {
    this.token = token
  }

  setMessageProcessor(processor: MessageProcessor): void {
    this.messageProcessor = processor
  }

  setSynergyManager(manager: any): void {
    this.synergyManager = manager
  }

  private updateStatus(newStatus: 'connected' | 'disconnected' | 'connecting' | 'error'): void {
    const now = Date.now()

    // Debounce status updates (except for 'connected')
    if (newStatus !== 'connected' && now - this.lastStatusUpdate < this.statusDebounceMs) {
      return
    }

    if (this.status === newStatus) return

    this.status = newStatus
    this.lastStatusUpdate = now
    appEvents.emitTelegramStatusChanged(this.status)
    console.log(`[Telegram] Status: ${this.status}`)
  }

  async start(): Promise<void> {
    if (!this.token || this.token.trim() === '') {
      console.log('[Telegram] No token provided')
      this.updateStatus('disconnected')
      return
    }

    try {
      this.updateStatus('connecting')

      // Clean up existing bot
      if (this.bot) {
        try {
          this.bot.removeAllListeners()
          await this.bot.stopPolling({ cancel: true })
        } catch (e) { }
        this.bot = null
      }

      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create new bot with optimized settings
      this.bot = new TelegramBotAPI(this.token, {
        polling: {
          autoStart: false,
          interval: 2000,
          params: {
            timeout: 30,
            allowed_updates: ['message', 'callback_query']
          }
        }
      })

      // Error handlers (silent - don't change status for temporary issues)
      this.bot.on('polling_error', (error: any) => {
        const msg = error.message || ''
        console.log('[Telegram] Polling issue:', error.code || msg.substring(0, 50))

        // Only mark as error for fatal issues
        if (msg.includes('401') || msg.includes('Unauthorized')) {
          console.error('[Telegram] Invalid token!')
          this.updateStatus('error')
        }
      })

      this.bot.on('error', (error) => {
        console.log('[Telegram] Bot issue:', error.message?.substring(0, 50))
      })

      // Message handler
      this.bot.on('message', (msg) => this.handleMessage(msg))

      // Test connection
      const me = await this.bot.getMe()
      console.log(`[Telegram] Bot: @${me.username}`)

      // Start polling
      await this.bot.startPolling()

      this.updateStatus('connected')
      console.log('[Telegram] ✓ Ready and listening')

    } catch (error: any) {
      console.error('[Telegram] Start failed:', error.message)
      this.updateStatus('error')
    }
  }

  async stop(): Promise<void> {
    if (this.bot) {
      try {
        this.bot.removeAllListeners()
        await this.bot.stopPolling({ cancel: true })
      } catch (e) { }
      this.bot = null
    }
    this.status = 'disconnected'
    appEvents.emitTelegramStatusChanged(this.status)
    console.log('[Telegram] Stopped')
  }

  getStatus(): string {
    return this.status
  }

  private async handleMessage(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id.toString()

    // Handle text messages
    if (msg.text) {
      // Command: /god (Toggle God Mode)
      if (msg.text.trim().toLowerCase() === '/god') {
        if (this.godModeChats.has(chatId)) {
          this.godModeChats.delete(chatId)
          await this.sendMessage(chatId, '🚫 God Mode DEACTIVATED. Back to standard chat.')
        } else {
          this.godModeChats.add(chatId)
          await this.sendMessage(chatId, '⚡ God Mode ACTIVATED. Messages will now be treated as Swarm Objectives.')
        }
        return
      }

      await this.processTextMessage(msg, chatId)
    }

    // Handle photos
    if (msg.photo) {
      const caption = msg.caption || 'User sent a photo'
      await this.processTextMessage({ ...msg, text: caption }, chatId)
    }

    // Handle documents
    if (msg.document) {
      const caption = msg.caption || `User sent a file: ${msg.document.file_name}`
      await this.processTextMessage({ ...msg, text: caption }, chatId)
    }

    // Handle voice
    if (msg.voice) {
      await this.processTextMessage({ ...msg, text: 'User sent a voice message' }, chatId)
    }
  }

  private async processTextMessage(msg: TelegramBotAPI.Message, chatId: string): Promise<void> {
    if (!msg.text) return

    // Prevent duplicate processing
    const msgKey = `${chatId}_${msg.message_id}`
    if (this.isProcessing.has(msgKey)) return
    this.isProcessing.add(msgKey)

    try {
      // Store user message
      const userMessage: StoredMessage = {
        id: `tg_${msg.message_id}_${Date.now()}`,
        chatId,
        text: msg.text,
        sender: 'user',
        timestamp: msg.date * 1000,
        platform: 'telegram'
      }

      if (!this.messages.has(chatId)) {
        this.messages.set(chatId, [])
      }
      this.messages.get(chatId)!.push(userMessage)
      appEvents.emitNewMessage(userMessage)

      // God Mode Routing
      if (this.godModeChats.has(chatId) && this.synergyManager) {
        console.log(`[Telegram] God Mode Objective from ${chatId}: ${msg.text}`)
        await this.sendMessage(chatId, '🧠 Swarm is analyzing your objective...')
        // Trigger Swarm
        this.synergyManager.globalPlanningPass(msg.text)
        return
      }

      // Process with AI (Standard Mode)
      if (this.messageProcessor && this.bot) {
        console.log(`[Telegram] Message from ${chatId}: ${msg.text.substring(0, 50)}...`)

        // Send typing indicator continuously
        const typingInterval = setInterval(async () => {
          try {
            if (this.bot) await this.bot.sendChatAction(chatId, 'typing')
          } catch (e) { }
        }, 3000)

        try {
          await this.bot.sendChatAction(chatId, 'typing')

          // Process message
          const response = await this.messageProcessor(msg.text, chatId, 'telegram')

          clearInterval(typingInterval)

          // Send response
          if (response) {
            await this.sendLongMessage(chatId, response)
          }
        } catch (error: any) {
          clearInterval(typingInterval)
          console.error('[Telegram] Process error:', error.message)

          try {
            await this.bot?.sendMessage(chatId, `❌ Error: ${error.message}`, { parse_mode: 'Markdown' })
          } catch (e) { }
        }
      }
    } finally {
      this.isProcessing.delete(msgKey)
    }
  }

  private async sendLongMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) return

    // Telegram message limit is 4096 characters
    const maxLength = 4000

    if (text.length <= maxLength) {
      await this.sendMessage(chatId, text)
      return
    }

    // Split into chunks
    const chunks: string[] = []
    let remaining = text

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining)
        break
      }

      // Try to split at a newline
      let splitIndex = remaining.lastIndexOf('\n', maxLength)
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        // Try to split at a space
        splitIndex = remaining.lastIndexOf(' ', maxLength)
        if (splitIndex === -1 || splitIndex < maxLength / 2) {
          splitIndex = maxLength
        }
      }

      chunks.push(remaining.substring(0, splitIndex))
      remaining = remaining.substring(splitIndex).trim()
    }

    // Send chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      await this.sendMessage(chatId, chunk)

      // Small delay between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) return

    try {
      // Try with Markdown first
      try {
        await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
      } catch (e) {
        // Fall back to plain text
        await this.bot.sendMessage(chatId, text)
      }

      // Store bot message
      const botMessage: StoredMessage = {
        id: `tg_bot_${Date.now()}`,
        chatId,
        text,
        sender: 'bot',
        timestamp: Date.now(),
        platform: 'telegram'
      }

      if (!this.messages.has(chatId)) {
        this.messages.set(chatId, [])
      }
      this.messages.get(chatId)!.push(botMessage)
      appEvents.emitNewMessage(botMessage)

    } catch (error: any) {
      console.error('[Telegram] Send error:', error.message)
    }
  }

  async sendPhoto(chatId: string, photo: string, caption?: string): Promise<void> {
    if (!this.bot) return
    try {
      await this.bot.sendPhoto(chatId, photo, { caption })
    } catch (error: any) {
      console.error('[Telegram] Photo error:', error.message)
    }
  }

  async sendDocument(chatId: string, document: string, caption?: string): Promise<void> {
    if (!this.bot) return
    try {
      await this.bot.sendDocument(chatId, document, { caption })
    } catch (error: any) {
      console.error('[Telegram] Document error:', error.message)
    }
  }

  async sendVoice(chatId: string, voice: string, caption?: string): Promise<void> {
    if (!this.bot) return
    try {
      await this.bot.sendVoice(chatId, voice, { caption })
    } catch (error: any) {
      console.error('[Telegram] Voice error:', error.message)
    }
  }

  async sendLocation(chatId: string, latitude: number, longitude: number): Promise<void> {
    if (!this.bot) return
    try {
      await this.bot.sendLocation(chatId, latitude, longitude)
    } catch (error: any) {
      console.error('[Telegram] Location error:', error.message)
    }
  }

  getMessages(chatId: string): StoredMessage[] {
    return this.messages.get(chatId) || []
  }

  clearMessages(chatId: string): void {
    this.messages.delete(chatId)
  }
}
