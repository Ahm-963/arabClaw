/**
 * Sessions Tool - Agent-to-Agent Communication
 * Based on OpenClaw's sessions_* tools implementation
 */

import { appEvents } from '../events'

// Tool input types
export interface SessionsListInput {
    // No required parameters - lists all active sessions
}

export interface SessionsHistoryInput {
    sessionId: string
    limit?: number
}

export interface SessionsSendInput {
    sessionId: string
    message: string
    replyBack?: boolean
    announce?: boolean
}

export interface SessionInfo {
    id: string
    name: string
    status: 'active' | 'idle' | 'busy'
    lastActivity: number
    channel?: string
    messageCount: number
}

export interface SessionMessage {
    id: string
    sessionId: string
    content: string
    timestamp: number
    isFromUser: boolean
}

// In-memory session store (would be more sophisticated in production)
const sessionStore: Map<string, {
    messages: SessionMessage[]
    lastActivity: number
    status: 'active' | 'idle' | 'busy'
    channel?: string
    name: string
}> = new Map()

/**
 * List all active sessions
 */
export async function sessionsList(_input: SessionsListInput): Promise<{ sessions: SessionInfo[] }> {
    const sessions: SessionInfo[] = []

    for (const [sessionId, data] of sessionStore) {
        sessions.push({
            id: sessionId,
            name: data.name,
            status: data.status,
            lastActivity: data.lastActivity,
            channel: data.channel,
            messageCount: data.messages.length
        })
    }

    return { sessions }
}

/**
 * Get message history for a session
 */
export async function sessionsHistory(input: SessionsHistoryInput): Promise<{ messages: SessionMessage[] }> {
    const session = sessionStore.get(input.sessionId)

    if (!session) {
        return { messages: [] }
    }

    const limit = input.limit || 50
    const messages = session.messages.slice(-limit)

    return { messages }
}

/**
 * Send a message to another session
 */
export async function sessionsSend(input: SessionsSendInput): Promise<{ success: boolean; messageId?: string; replyRequired?: boolean }> {
    const session = sessionStore.get(input.sessionId)

    if (!session) {
        return { success: false }
    }

    const messageId = `msg_${Date.now()}`

    // Add message to target session
    session.messages.push({
        id: messageId,
        sessionId: input.sessionId,
        content: input.message,
        timestamp: Date.now(),
        isFromUser: false
    })

    session.lastActivity = Date.now()

    // Emit event for the target session
    appEvents.emit('session:message', {
        sessionId: input.sessionId,
        messageId,
        content: input.message,
        replyBack: input.replyBack,
        announce: input.announce
    })

    return { success: true, messageId, replyRequired: input.replyBack }
}

/**
 * Register a new session
 */
export function registerSession(sessionId: string, name: string, channel?: string): void {
    if (!sessionStore.has(sessionId)) {
        sessionStore.set(sessionId, {
            messages: [],
            lastActivity: Date.now(),
            status: 'active',
            channel,
            name
        })
    }
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): void {
    const session = sessionStore.get(sessionId)
    if (session) {
        session.lastActivity = Date.now()
    }
}

/**
 * Add message to session
 */
export function addSessionMessage(sessionId: string, content: string, isFromUser: boolean): string {
    const session = sessionStore.get(sessionId)
    if (!session) {
        throw new Error(`Session ${sessionId} not found`)
    }

    const messageId = `msg_${Date.now()}`
    session.messages.push({
        id: messageId,
        sessionId,
        content,
        timestamp: Date.now(),
        isFromUser
    })
    session.lastActivity = Date.now()

    return messageId
}

/**
 * Unregister a session
 */
export function unregisterSession(sessionId: string): void {
    sessionStore.delete(sessionId)
}

/**
 * Get all sessions as array
 */
export function getAllSessions(): SessionInfo[] {
    const sessions: SessionInfo[] = []

    for (const [sessionId, data] of sessionStore) {
        sessions.push({
            id: sessionId,
            name: data.name,
            status: data.status,
            lastActivity: data.lastActivity,
            channel: data.channel,
            messageCount: data.messages.length
        })
    }

    return sessions
}

/**
 * Find session by name
 */
export function findSessionByName(name: string): SessionInfo | undefined {
    for (const [sessionId, data] of sessionStore) {
        if (data.name.toLowerCase().includes(name.toLowerCase())) {
            return {
                id: sessionId,
                name: data.name,
                status: data.status,
                lastActivity: data.lastActivity,
                channel: data.channel,
                messageCount: data.messages.length
            }
        }
    }
    return undefined
}
