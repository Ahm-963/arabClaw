/**
 * Signal Messenger Integration
 * Uses signal-cli for Signal protocol support
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { appEvents } from '../events'

const execAsync = promisify(exec)

interface SignalMessage {
  id: string
  chatId: string
  text: string
  sender: 'user' | 'bot'
  timestamp: number
  platform: 'signal'
  senderNumber?: string
  senderName?: string
}

type MessageProcessor = (message: string, chatId: string, platform: string) => Promise<string>

export class SignalBot {
  private status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected'
  private phoneNumber: string = ''
  private messages: Map<string, SignalMessage[]> = new Map()
  private messageProcessor: MessageProcessor | null = null
  private signalCliPath: string = ''
  private configPath: string = ''
  private pollInterval: NodeJS.Timeout | null = null

  constructor() {
    this.configPath = path.join(app?.getPath('userData') || '.', 'signal-cli')
  }

  setMessageProcessor(processor: MessageProcessor): void {
    this.messageProcessor = processor
  }

  async initialize(): Promise<void> {
    // Create config directory
    await fs.mkdir(this.configPath, { recursive: true })
    
    // Check if signal-cli is available
    try {
      await execAsync('signal-cli --version')
      this.signalCliPath = 'signal-cli'
    } catch {
      // Try common installation paths
      const paths = [
        'C:\\Program Files\\signal-cli\\bin\\signal-cli.bat',
        'C:\\signal-cli\\bin\\signal-cli.bat',
        path.join(process.env.LOCALAPPDATA || '', 'signal-cli', 'bin', 'signal-cli.bat')
      ]
      
      for (const p of paths) {
        try {
          await fs.access(p)
          this.signalCliPath = p
          break
        } catch {}
      }
    }
    
    if (!this.signalCliPath) {
      console.log('[Signal] signal-cli not found. Please install from: https://github.com/AsamK/signal-cli')
    }
  }

  async register(phoneNumber: string, captcha?: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.phoneNumber = phoneNumber
      this.updateStatus('connecting')

      let cmd = `"${this.signalCliPath}" -u ${phoneNumber} register`
      if (captcha) {
        cmd += ` --captcha "${captcha}"`
      }

      await execAsync(cmd)
      return { success: true }
    } catch (error: any) {
      this.updateStatus('error')
      return { success: false, error: error.message }
    }
  }

  async verify(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.phoneNumber = phoneNumber
      await execAsync(`"${this.signalCliPath}" -u ${phoneNumber} verify ${code}`)
      this.updateStatus('connected')
      return { success: true }
    } catch (error: any) {
      this.updateStatus('error')
      return { success: false, error: error.message }
    }
  }

  async link(deviceName: string = 'Rami Bot'): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    try {
      this.updateStatus('connecting')
      
      // Generate linking URI
      const { stdout } = await execAsync(`"${this.signalCliPath}" link -n "${deviceName}"`)
      
      // The output contains a tsdevice:// URI that can be converted to QR
      const uri = stdout.trim()
      
      return { success: true, qrCode: uri }
    } catch (error: any) {
      this.updateStatus('error')
      return { success: false, error: error.message }
    }
  }

  async start(phoneNumber: string): Promise<void> {
    this.phoneNumber = phoneNumber
    this.updateStatus('connecting')

    try {
      // Test connection
      await execAsync(`"${this.signalCliPath}" -u ${phoneNumber} receive --timeout 1`)
      this.updateStatus('connected')
      
      // Start polling for messages
      this.startPolling()
    } catch (error: any) {
      console.error('[Signal] Start error:', error.message)
      this.updateStatus('error')
    }
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.updateStatus('disconnected')
  }

  private startPolling(): void {
    if (this.pollInterval) return

    this.pollInterval = setInterval(async () => {
      try {
        await this.receiveMessages()
      } catch (error: any) {
        console.error('[Signal] Poll error:', error.message)
      }
    }, 5000) // Poll every 5 seconds
  }

  private async receiveMessages(): Promise<void> {
    try {
      const { stdout } = await execAsync(
        `"${this.signalCliPath}" -u ${this.phoneNumber} receive --json --timeout 1`,
        { timeout: 10000 }
      )

      if (!stdout.trim()) return

      const lines = stdout.trim().split('\n')
      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          await this.handleIncomingMessage(data)
        } catch {}
      }
    } catch (error: any) {
      // Timeout is normal when no messages
      if (!error.message.includes('timeout')) {
        throw error
      }
    }
  }

  private async handleIncomingMessage(data: any): Promise<void> {
    if (!data.envelope?.dataMessage?.message) return

    const envelope = data.envelope
    const chatId = envelope.source || envelope.sourceNumber
    const text = envelope.dataMessage.message

    if (!text || !chatId) return

    // Store user message
    const userMessage: SignalMessage = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      text,
      sender: 'user',
      timestamp: envelope.timestamp || Date.now(),
      platform: 'signal',
      senderNumber: envelope.sourceNumber,
      senderName: envelope.sourceName
    }

    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, [])
    }
    this.messages.get(chatId)!.push(userMessage)
    appEvents.emitNewMessage(userMessage)

    // Process with AI
    if (this.messageProcessor) {
      try {
        console.log(`[Signal] Message from ${chatId}: ${text.substring(0, 50)}...`)
        
        const response = await this.messageProcessor(text, chatId, 'signal')
        
        if (response) {
          await this.sendMessage(chatId, response)
        }
      } catch (error: any) {
        console.error('[Signal] Process error:', error.message)
        await this.sendMessage(chatId, `❌ Error: ${error.message}`)
      }
    }
  }

  async sendMessage(recipient: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Escape message for command line
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '\\n')
      
      await execAsync(
        `"${this.signalCliPath}" -u ${this.phoneNumber} send -m "${escapedMessage}" ${recipient}`
      )

      // Store bot message
      const botMessage: SignalMessage = {
        id: `sig_bot_${Date.now()}`,
        chatId: recipient,
        text: message,
        sender: 'bot',
        timestamp: Date.now(),
        platform: 'signal'
      }

      if (!this.messages.has(recipient)) {
        this.messages.set(recipient, [])
      }
      this.messages.get(recipient)!.push(botMessage)
      appEvents.emitNewMessage(botMessage)

      return { success: true }
    } catch (error: any) {
      console.error('[Signal] Send error:', error.message)
      return { success: false, error: error.message }
    }
  }

  async sendGroupMessage(groupId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '\\n')
      
      await execAsync(
        `"${this.signalCliPath}" -u ${this.phoneNumber} send -m "${escapedMessage}" -g ${groupId}`
      )

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async sendAttachment(recipient: string, filePath: string, message?: string): Promise<{ success: boolean; error?: string }> {
    try {
      let cmd = `"${this.signalCliPath}" -u ${this.phoneNumber} send -a "${filePath}"`
      if (message) {
        cmd += ` -m "${message.replace(/"/g, '\\"')}"`
      }
      cmd += ` ${recipient}`

      await execAsync(cmd)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async getContacts(): Promise<any[]> {
    try {
      const { stdout } = await execAsync(
        `"${this.signalCliPath}" -u ${this.phoneNumber} listContacts`
      )
      // Parse contacts output
      return stdout.trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
  }

  async getGroups(): Promise<any[]> {
    try {
      const { stdout } = await execAsync(
        `"${this.signalCliPath}" -u ${this.phoneNumber} listGroups`
      )
      return stdout.trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
  }

  private updateStatus(status: typeof this.status): void {
    this.status = status
    appEvents.emit('signal:status', status)
  }

  getStatus(): string {
    return this.status
  }

  getMessages(chatId: string): SignalMessage[] {
    return this.messages.get(chatId) || []
  }

  clearMessages(chatId: string): void {
    this.messages.delete(chatId)
  }
}

export const signalBot = new SignalBot()
