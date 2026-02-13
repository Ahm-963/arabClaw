/**
 * Collaboration History Tracker
 * Records and manages agent-to-agent collaboration history
 */

import * as fs from 'fs/promises'
import * as path from 'path'

// Define collaboration record structure
export interface CollaborationRecord {
    id: string
    timestamp: number
    requestorAgentId: string
    requestorAgentName: string
    helperAgentId: string
    helperAgentName: string
    requiredSkills: string[]
    taskDescription: string
    result: string
    success: boolean
    duration: number
    depth: number
}

// Agent pair metrics
export interface AgentPairMetrics {
    requestorId: string
    requestorName: string
    helperId: string
    helperName: string
    totalCollaborations: number
    successfulCollaborations: number
    successRate: number
    averageDuration: number
    skillMatchScore: number
    lastCollaboration: number
    trend: 'improving' | 'stable' | 'declining'
}

export class CollaborationHistory {
    private history: CollaborationRecord[] = []
    private dataPath: string
    private maxRecords: number = 1000 // Keep last 1000 records

    constructor(dataPath: string) {
        this.dataPath = path.join(dataPath, 'collaboration-history.json')
    }

    /**
     * Initialize and load existing history
     */
    async initialize(): Promise<void> {
        try {
            const data = await fs.readFile(this.dataPath, 'utf-8')
            this.history = JSON.parse(data)
            console.log(`[CollabHistory] Loaded ${this.history.length} records`)
        } catch (error) {
            // File doesn't exist yet, start fresh
            this.history = []
            console.log('[CollabHistory] Starting fresh history')
        }
    }

    /**
     * Record a new collaboration
     */
    async recordCollaboration(record: CollaborationRecord): Promise<void> {
        this.history.push(record)

        // Trim to max records (keep most recent)
        if (this.history.length > this.maxRecords) {
            this.history = this.history.slice(-this.maxRecords)
        }

        await this.save()
        console.log(`[CollabHistory] Recorded collaboration: ${record.requestorAgentName} -> ${record.helperAgentName}`)
    }

    /**
     * Get all collaboration records
     */
    getAllRecords(): CollaborationRecord[] {
        return [...this.history]
    }

    /**
     * Get recent collaborations (last N)
     */
    getRecentRecords(limit: number = 50): CollaborationRecord[] {
        return this.history.slice(-limit).reverse()
    }

    /**
     * Get collaborations for a specific agent
     */
    getAgentRecords(agentId: string): CollaborationRecord[] {
        return this.history.filter(
            r => r.requestorAgentId === agentId || r.helperAgentId === agentId
        )
    }

    /**
     * Get collaborations between two specific agents
     */
    getPairRecords(requestorId: string, helperId: string): CollaborationRecord[] {
        return this.history.filter(
            r => r.requestorAgentId === requestorId && r.helperAgentId === helperId
        )
    }

    /**
     * Calculate metrics for an agent pair
     */
    getPairMetrics(requestorId: string, helperId: string): AgentPairMetrics | null {
        const records = this.getPairRecords(requestorId, helperId)

        if (records.length === 0) {
            return null
        }

        const successful = records.filter(r => r.success).length
        const totalDuration = records.reduce((sum, r) => sum + r.duration, 0)

        // Calculate trend (compare recent vs older performance)
        const recentRecords = records.slice(-5)
        const olderRecords = records.slice(0, -5)

        let trend: 'improving' | 'stable' | 'declining' = 'stable'
        if (recentRecords.length >= 3 && olderRecords.length >= 3) {
            const recentSuccess = recentRecords.filter(r => r.success).length / recentRecords.length
            const olderSuccess = olderRecords.filter(r => r.success).length / olderRecords.length

            if (recentSuccess > olderSuccess + 0.1) trend = 'improving'
            else if (recentSuccess < olderSuccess - 0.1) trend = 'declining'
        }

        return {
            requestorId,
            requestorName: records[0].requestorAgentName,
            helperId,
            helperName: records[0].helperAgentName,
            totalCollaborations: records.length,
            successfulCollaborations: successful,
            successRate: (successful / records.length) * 100,
            averageDuration: totalDuration / records.length,
            skillMatchScore: this.calculateSkillMatchScore(records),
            lastCollaboration: records[records.length - 1].timestamp,
            trend
        }
    }

    /**
     * Get all agent pair metrics
     */
    getAllPairMetrics(): AgentPairMetrics[] {
        const pairs = new Map<string, AgentPairMetrics>()

        for (const record of this.history) {
            const key = `${record.requestorAgentId}:${record.helperAgentId}`

            if (!pairs.has(key)) {
                const metrics = this.getPairMetrics(record.requestorAgentId, record.helperAgentId)
                if (metrics) {
                    pairs.set(key, metrics)
                }
            }
        }

        return Array.from(pairs.values())
    }

    /**
     * Find best helper for requestor based on history
     */
    findBestHelper(requestorId: string, candidateHelpers: string[]): string | null {
        let bestHelper: string | null = null
        let bestScore = -1

        for (const helperId of candidateHelpers) {
            const metrics = this.getPairMetrics(requestorId, helperId)

            if (metrics) {
                // Score = success rate * (1 + recency bonus)
                const recencyBonus = Math.min(0.5, (Date.now() - metrics.lastCollaboration) / (1000 * 60 * 60 * 24 * 30)) // Max 0.5 bonus for recent collabs
                const score = metrics.successRate * (1 + recencyBonus)

                if (score > bestScore) {
                    bestScore = score
                    bestHelper = helperId
                }
            }
        }

        return bestHelper
    }

    /**
     * Calculate skill match score based on history
     */
    private calculateSkillMatchScore(records: CollaborationRecord[]): number {
        if (records.length === 0) return 0

        // Simple average based on success
        const successful = records.filter(r => r.success).length
        return (successful / records.length) * 100
    }

    /**
     * Save history to disk
     */
    private async save(): Promise<void> {
        try {
            await fs.writeFile(this.dataPath, JSON.stringify(this.history, null, 2))
        } catch (error) {
            console.error('[CollabHistory] Failed to save:', error)
        }
    }

    /**
     * Clear all history (for testing/reset)
     */
    async clearHistory(): Promise<void> {
        this.history = []
        await this.save()
        console.log('[CollabHistory] History cleared')
    }
}
