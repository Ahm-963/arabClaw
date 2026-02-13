import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { appEvents } from '../events'

/**
 * Policy Audit Logger
 * Maintains append-only log of all policy decisions for compliance and debugging
 */

export interface PolicyAuditLog {
    id: string
    timestamp: number
    agentId: string
    agentRole: string
    action: string
    resource: string
    resourceId?: string
    decision: 'allow' | 'deny'
    matchedRule?: string
    temporaryGrant?: string
    reason: string
    context?: any
    before?: any // State snapshot before action
    after?: any  // State snapshot after action
}

export class AuditLogger {
    private logPath: string
    private logStream: any = null
    private buffer: PolicyAuditLog[] = []
    private readonly BUFFER_SIZE = 10 // Flush every 10 entries
    private readonly MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB per log file

    constructor() {
        const userDataPath = app?.getPath('userData') || '.'
        const auditDir = path.join(userDataPath, 'audit-logs')
        this.logPath = path.join(auditDir, `policy-${new Date().toISOString().split('T')[0]}.jsonl`)
    }

    /**
     * Initialize the audit logger
     */
    async initialize(): Promise<void> {
        const userDataPath = app?.getPath('userData') || '.'
        const auditDir = path.join(userDataPath, 'audit-logs')
        this.logPath = path.join(auditDir, `policy-${new Date().toISOString().split('T')[0]}.jsonl`)

        await fs.mkdir(auditDir, { recursive: true })
        this.buffer = [] // Clear buffer on init
        console.log('[AuditLogger] Initialized:', this.logPath)
    }

    /**
     * Log a policy decision
     */
    async log(entry: Omit<PolicyAuditLog, 'id' | 'timestamp'>): Promise<void> {
        const fullEntry: PolicyAuditLog = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...entry
        }

        this.buffer.push(fullEntry)

        // Emit event for real-time monitoring
        appEvents.emit('audit:policy_decision', fullEntry)

        // Flush if buffer is full
        if (this.buffer.length >= this.BUFFER_SIZE) {
            await this.flush()
        }
    }

    /**
     * Log a general action with snapshots
     */
    async logAction(
        agentId: string,
        action: string,
        resource: string,
        before?: any,
        after?: any,
        context?: any
    ): Promise<void> {
        // Extract resourceId from context if available for transcript matching
        const resourceId = context?.taskId || context?.question || context?.resourceId

        await this.log({
            agentId,
            agentRole: 'automated',
            action,
            resource,
            resourceId,
            decision: 'allow',
            reason: 'General system action',
            before,
            after,
            context
        })
    }

    /**
     * Flush buffer to disk
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return

        try {
            const lines = this.buffer.map(entry => JSON.stringify(entry)).join('\n') + '\n'
            await fs.appendFile(this.logPath, lines, 'utf-8')

            console.log(`[AuditLogger] Flushed ${this.buffer.length} entries`)
            this.buffer = []

            // Check file size and rotate if needed
            await this.rotateIfNeeded()
        } catch (error: any) {
            console.error('[AuditLogger] Flush failed:', error.message)
        }
    }

    /**
     * Rotate log file if it exceeds max size
     */
    private async rotateIfNeeded(): Promise<void> {
        try {
            const stats = await fs.stat(this.logPath)
            if (stats.size > this.MAX_LOG_SIZE) {
                const timestamp = Date.now()
                const archivePath = this.logPath.replace('.jsonl', `-${timestamp}.jsonl`)
                await fs.rename(this.logPath, archivePath)
                console.log('[AuditLogger] Rotated log to:', archivePath)
            }
        } catch {
            // File doesn't exist yet, that's fine
        }
    }

    /**
     * Query audit logs
     */
    async query(filters: {
        agentId?: string
        decision?: 'allow' | 'deny'
        startTime?: number
        endTime?: number
        limit?: number
    }): Promise<PolicyAuditLog[]> {
        const results: PolicyAuditLog[] = []

        // Start with buffered entries (most recent)
        const allEntries = [...this.buffer]

        try {
            // Add entries from disk
            if (await fs.access(this.logPath).then(() => true).catch(() => false)) {
                const content = await fs.readFile(this.logPath, 'utf-8')
                const lines = content.trim().split('\n')
                for (const line of lines) {
                    if (line.trim()) {
                        results.push(JSON.parse(line))
                    }
                }
            }

            // Combine and filter
            const combined = [...results, ...allEntries]

            const filtered = combined.filter(entry => {
                // Apply filters
                if (filters.agentId && entry.agentId !== filters.agentId) return false
                if (filters.decision && entry.decision !== filters.decision) return false
                if (filters.startTime && entry.timestamp < filters.startTime) return false
                if (filters.endTime && entry.timestamp > filters.endTime) return false
                return true
            })

            // Sort by timestamp and apply limit
            return filtered
                .sort((a, b) => b.timestamp - a.timestamp) // Sort descending
                .slice(0, filters.limit || 1000)
                .reverse() // Return as chronological for transcript if needed (or keep descending)
        } catch (error: any) {
            console.error('[AuditLogger] Query failed:', error.message)
            return allEntries.filter(entry => {
                if (filters.agentId && entry.agentId !== filters.agentId) return false
                return true
            })
        }
    }

    /**
     * Export audit logs to CSV
     */
    async exportToCSV(outputPath: string): Promise<void> {
        const logs = await this.query({ limit: 10000 })

        const csv = [
            'Timestamp,Agent ID,Agent Role,Action,Resource,Resource ID,Decision,Matched Rule,Reason',
            ...logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.agentId,
                log.agentRole,
                log.action,
                log.resource,
                log.resourceId || '',
                log.decision,
                log.matchedRule || '',
                `"${log.reason.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n')

        await fs.writeFile(outputPath, csv, 'utf-8')
        console.log('[AuditLogger] Exported to CSV:', outputPath)
    }

    /**
     * Generate a human-readable Markdown transcript for a task/resource
     */
    async generateTranscript(resourceId: string): Promise<string> {
        const logs = await this.query({ limit: 1000 })
        const relevantLogs = logs.filter(l =>
            l.resourceId === resourceId ||
            (l.context && (l.context.taskId === resourceId || l.context.question === resourceId))
        ).sort((a, b) => a.timestamp - b.timestamp)

        if (relevantLogs.length === 0) return '# No transcript available for this resource'

        let md = `# Action Transcript: ${resourceId}\n\n`
        md += `**Date:** ${new Date(relevantLogs[0].timestamp).toLocaleDateString()}\n`
        md += `**Total Events:** ${relevantLogs.length}\n\n---\n\n`

        for (const log of relevantLogs) {
            const time = new Date(log.timestamp).toLocaleTimeString()
            md += `### [${time}] ${log.action.replace(/_/g, ' ').toUpperCase()}\n`
            md += `**Agent:** \`${log.agentId}\` (${log.agentRole})\n`
            md += `**Decision:** ${log.decision === 'allow' ? '✅ ALLOW' : '❌ DENY'}\n`
            md += `**Reason:** ${log.reason}\n\n`

            if (log.context) {
                md += '**Context:**\n'
                md += '```json\n'
                md += JSON.stringify(log.context, null, 2)
                md += '\n```\n\n'
            }

            if (log.before || log.after) {
                md += '**State Change:**\n'
                md += '```json\n'
                md += JSON.stringify({ before: log.before, after: log.after }, null, 2)
                md += '\n```\n\n'
            }

            md += '---\n\n'
        }

        return md
    }

    /**
     * Get statistics
     */
    async getStats(): Promise<{
        totalDecisions: number
        allowed: number
        denied: number
        byAgent: Record<string, number>
    }> {
        const logs = await this.query({})

        const stats = {
            totalDecisions: logs.length,
            allowed: logs.filter(l => l.decision === 'allow').length,
            denied: logs.filter(l => l.decision === 'deny').length,
            byAgent: {} as Record<string, number>
        }

        for (const log of logs) {
            stats.byAgent[log.agentId] = (stats.byAgent[log.agentId] || 0) + 1
        }

        return stats
    }
}

export const auditLogger = new AuditLogger()
