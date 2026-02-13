/**
 * Canvas Tool - Visual Workspace
 * Based on OpenClaw's Canvas + A2UI implementation
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { appEvents } from '../events'

// Canvas message types
export interface CanvasMessage {
    type: 'text' | 'image' | 'json' | 'action'
    content: string
    timestamp: number
    id: string
}

export interface CanvasAction {
    type: 'push' | 'reset' | 'clear' | 'update'
    content?: string
    data?: Record<string, any>
    id?: string
}

export interface CanvasConfig {
    enabled: boolean
    storagePath: string
    maxMessages: number
    autoSave: boolean
}

const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
    enabled: true,
    storagePath: 'canvas',
    maxMessages: 100,
    autoSave: true
}

export class CanvasManager {
    private messages: CanvasMessage[] = []
    private config: CanvasConfig = DEFAULT_CANVAS_CONFIG
    private storagePath: string = ''
    private initialized = false

    constructor() {
        this.storagePath = path.join(app.getPath('userData'), 'canvas')
    }

    /**
     * Initialize the canvas manager
     */
    async initialize(): Promise<void> {
        if (this.initialized) return

        // Create canvas directory if it doesn't exist
        try {
            await fs.mkdir(this.storagePath, { recursive: true })
        } catch (error) {
            console.error('[Canvas] Failed to create storage directory:', error)
        }

        // Load existing messages
        await this.loadMessages()

        this.initialized = true
        console.log('[Canvas] Canvas manager initialized')
    }

    /**
     * Push a message to the canvas
     */
    push(content: string, type: CanvasMessage['type'] = 'text'): CanvasMessage {
        const message: CanvasMessage = {
            id: `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            content,
            timestamp: Date.now()
        }

        this.messages.push(message)

        // Limit message count
        while (this.messages.length > this.config.maxMessages) {
            this.messages.shift()
        }

        // Auto-save
        if (this.config.autoSave) {
            this.saveMessages().catch(console.error)
        }

        // Emit event for real-time UI updates
        appEvents.sendToRenderer('canvas:message', message)

        return message
    }

    /**
     * Push JSON data to the canvas
     */
    pushJson(data: Record<string, any>): CanvasMessage {
        return this.push(JSON.stringify(data, null, 2), 'json')
    }

    /**
     * Push an image (base64 or URL)
     */
    pushImage(content: string): CanvasMessage {
        return this.push(content, 'image')
    }

    /**
     * Reset the canvas (clear all messages)
     */
    reset(): void {
        this.messages = []
        this.saveMessages().catch(console.error)
        appEvents.sendToRenderer('canvas:message', { type: 'reset' })
    }

    /**
     * Get all messages
     */
    getMessages(): CanvasMessage[] {
        return [...this.messages]
    }

    /**
     * Get messages as text
     */
    getTextContent(): string {
        return this.messages
            .map(m => `[${new Date(m.timestamp).toISOString()}] [${m.type.toUpperCase()}] ${m.content}`)
            .join('\n')
    }

    /**
     * Get last N messages
     */
    getRecentMessages(count: number): CanvasMessage[] {
        return this.messages.slice(-count)
    }

    /**
     * Export canvas to file
     */
    async exportToFile(filePath: string): Promise<void> {
        const content = this.getTextContent()
        await fs.writeFile(filePath, content, 'utf-8')
    }

    /**
     * Import canvas from file
     */
    async importFromFile(filePath: string): Promise<void> {
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n')

        for (const line of lines) {
            if (line.trim()) {
                this.push(line, 'text')
            }
        }
    }

    /**
     * Save messages to storage
     */
    private async saveMessages(): Promise<void> {
        try {
            const filePath = path.join(this.storagePath, 'messages.json')
            await fs.writeFile(filePath, JSON.stringify(this.messages, null, 2), 'utf-8')
        } catch (error) {
            console.error('[Canvas] Failed to save messages:', error)
        }
    }

    /**
     * Load messages from storage
     */
    private async loadMessages(): Promise<void> {
        try {
            const filePath = path.join(this.storagePath, 'messages.json')
            const content = await fs.readFile(filePath, 'utf-8')
            this.messages = JSON.parse(content)
        } catch (error) {
            // No existing messages is fine
            this.messages = []
        }
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<CanvasConfig>): void {
        this.config = { ...this.config, ...updates }
    }

    /**
     * Get configuration
     */
    getConfig(): CanvasConfig {
        return { ...this.config }
    }

    /**
     * Get message count
     */
    getCount(): number {
        return this.messages.length
    }

    /**
     * Clear canvas and save
     */
    async clear(): Promise<void> {
        this.reset()
    }

    /**
     * Search messages
     */
    search(query: string): CanvasMessage[] {
        const lowerQuery = query.toLowerCase()
        return this.messages.filter(m =>
            m.content.toLowerCase().includes(lowerQuery)
        )
    }

    /**
     * Get messages by type
     */
    getMessagesByType(type: CanvasMessage['type']): CanvasMessage[] {
        return this.messages.filter(m => m.type === type)
    }
}

export const canvasManager = new CanvasManager()

// Tool functions for use by agents

/**
 * Push content to canvas
 */
export async function canvasPush(input: { content: string; type?: 'text' | 'image' | 'json' }): Promise<{ id: string; type: string; content: string }> {
    await canvasManager.initialize()
    const message = canvasManager.push(input.content, input.type || 'text')
    return { id: message.id, type: message.type, content: message.content }
}

/**
 * Reset canvas
 */
export async function canvasReset(): Promise<{ success: boolean }> {
    await canvasManager.initialize()
    canvasManager.reset()
    return { success: true }
}

/**
 * Get canvas content
 */
export async function canvasGet(): Promise<{ messages: CanvasMessage[]; text: string }> {
    await canvasManager.initialize()
    return {
        messages: canvasManager.getMessages(),
        text: canvasManager.getTextContent()
    }
}

/**
 * Export canvas to file
 */
export async function canvasExport(input: { filePath: string }): Promise<{ success: boolean }> {
    await canvasManager.initialize()
    await canvasManager.exportToFile(input.filePath)
    return { success: true }
}
