import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

/**
 * Rollback Manager
 * Maintains backups and rollback plans for destructive actions
 */

export interface RollbackEntry {
    id: string
    timestamp: number
    action: 'write' | 'delete' | 'execute'
    target: string
    backup?: string // Path to backup file
    originalContent?: string
    canRollback: boolean
    rolledBack: boolean
}

export class RollbackManager {
    private rollbackDir: string
    private entries: Map<string, RollbackEntry> = new Map()
    private readonly TTL_DAYS = 7
    private readonly MAX_BACKUP_SIZE = 100 * 1024 * 1024 // 100MB per backup

    constructor() {
        const userDataPath = app?.getPath('userData') || '.'
        this.rollbackDir = path.join(userDataPath, '.rami', 'rollback')
    }

    /**
     * Initialize rollback system
     */
    async initialize(): Promise<void> {
        await fs.mkdir(this.rollbackDir, { recursive: true })
        await this.cleanup() // Remove old backups
        console.log('[RollbackManager] Initialized:', this.rollbackDir)
    }

    /**
     * Create backup before file modification
     */
    async backupFile(filePath: string): Promise<string | null> {
        try {
            const content = await fs.readFile(filePath, 'utf-8')
            const timestamp = Date.now()
            const backupName = `${path.basename(filePath)}.${timestamp}.bak`
            const backupPath = path.join(this.rollbackDir, backupName)

            await fs.writeFile(backupPath, content, 'utf-8')

            const entry: RollbackEntry = {
                id: `rollback_${timestamp}`,
                timestamp,
                action: 'write',
                target: filePath,
                backup: backupPath,
                originalContent: content,
                canRollback: true,
                rolledBack: false
            }

            this.entries.set(entry.id, entry)
            console.log('[RollbackManager] Backed up:', filePath)

            return backupPath
        } catch (error: any) {
            console.error('[RollbackManager] Backup failed:', error.message)
            return null
        }
    }

    /**
     * Rollback a file to its backup
     */
    async rollback(entryId: string): Promise<boolean> {
        const entry = this.entries.get(entryId)
        if (!entry) {
            console.error('[RollbackManager] Entry not found:', entryId)
            return false
        }

        if (!entry.canRollback) {
            console.error('[RollbackManager] Cannot rollback:', entryId)
            return false
        }

        try {
            if (entry.backup && entry.originalContent) {
                await fs.writeFile(entry.target, entry.originalContent, 'utf-8')
                entry.rolledBack = true
                console.log('[RollbackManager] Rolled back:', entry.target)
                return true
            }
            return false
        } catch (error: any) {
            console.error('[RollbackManager] Rollback failed:', error.message)
            return false
        }
    }

    /**
     * Get rollback history
     */
    getHistory(limit: number = 50): RollbackEntry[] {
        return Array.from(this.entries.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
    }

    /**
     * Cleanup old backups (TTL expired)
     */
    private async cleanup(): Promise<void> {
        const ttlMs = this.TTL_DAYS * 24 * 60 * 60 * 1000
        const cutoff = Date.now() - ttlMs
        let cleaned = 0

        for (const [id, entry] of this.entries.entries()) {
            if (entry.timestamp < cutoff) {
                // Delete backup file
                if (entry.backup) {
                    try {
                        await fs.unlink(entry.backup)
                    } catch {
                        // File may not exist
                    }
                }
                this.entries.delete(id)
                cleaned++
            }
        }

        if (cleaned > 0) {
            console.log(`[RollbackManager] Cleaned ${cleaned} old backups`)
        }
    }

    /**
     * Get total backup size
     */
    async getBackupSize(): Promise<number> {
        let total = 0
        for (const entry of this.entries.values()) {
            if (entry.backup) {
                try {
                    const stats = await fs.stat(entry.backup)
                    total += stats.size
                } catch {
                    // Ignore
                }
            }
        }
        return total
    }
}

export const rollbackManager = new RollbackManager()
