import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { appEvents } from '../events'

/**
 * Diff Manager
 * Generates and displays diffs before applying file changes
 */

export interface DiffPreview {
    id: string
    timestamp: number
    filePath: string
    oldContent: string
    newContent: string
    diff: string
    approved?: boolean
    approvedBy?: string
    approvedAt?: number
}

export class DiffManager {
    private pendingDiffs: Map<string, DiffPreview> = new Map()

    /**
     * Generate diff preview for file change
     */
    async generateDiff(filePath: string, newContent: string): Promise<DiffPreview> {
        let oldContent = ''

        try {
            oldContent = await fs.readFile(filePath, 'utf-8')
        } catch {
            // File doesn't exist, that's fine (new file)
            oldContent = ''
        }

        const diff = this.createUnifiedDiff(oldContent, newContent, filePath)

        const preview: DiffPreview = {
            id: `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            filePath,
            oldContent,
            newContent,
            diff
        }

        this.pendingDiffs.set(preview.id, preview)

        // Emit to UI for review
        appEvents.emit('diff:preview_required', preview)

        return preview
    }

    /**
     * Create unified diff (simple implementation)
     */
    private createUnifiedDiff(oldContent: string, newContent: string, filePath: string): string {
        const oldLines = oldContent.split('\n')
        const newLines = newContent.split('\n')

        const diff: string[] = []
        diff.push(`--- ${filePath}`)
        diff.push(`+++ ${filePath}`)
        diff.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`)

        // Simple line-by-line diff (not optimized)
        const maxLen = Math.max(oldLines.length, newLines.length)

        for (let i = 0; i < maxLen; i++) {
            const oldLine = oldLines[i]
            const newLine = newLines[i]

            if (oldLine === newLine) {
                diff.push(` ${oldLine || ''}`)
            } else {
                if (oldLine !== undefined) diff.push(`-${oldLine}`)
                if (newLine !== undefined) diff.push(`+${newLine}`)
            }
        }

        return diff.join('\n')
    }

    /**
     * Approve a diff
     */
    async approveDiff(diffId: string, approvedBy: string = 'user'): Promise<boolean> {
        const preview = this.pendingDiffs.get(diffId)
        if (!preview) {
            console.error('[DiffManager] Diff not found:', diffId)
            return false
        }

        preview.approved = true
        preview.approvedBy = approvedBy
        preview.approvedAt = Date.now()

        // Apply the changes
        try {
            await fs.writeFile(preview.filePath, preview.newContent, 'utf-8')
            console.log('[DiffManager] Applied approved diff:', preview.filePath)

            appEvents.emit('diff:applied', preview)
            this.pendingDiffs.delete(diffId)

            return true
        } catch (error: any) {
            console.error('[DiffManager] Failed to apply diff:', error.message)
            return false
        }
    }

    /**
     * Reject a diff
     */
    rejectDiff(diffId: string): void {
        const preview = this.pendingDiffs.get(diffId)
        if (preview) {
            appEvents.emit('diff:rejected', preview)
            this.pendingDiffs.delete(diffId)
            console.log('[DiffManager] Rejected diff:', preview.filePath)
        }
    }

    /**
     * Get pending diffs
     */
    getPendingDiffs(): DiffPreview[] {
        return Array.from(this.pendingDiffs.values())
    }

    /**
     * Check if diff approval is required (based on settings)
     */
    async requiresApproval(filePath: string): Promise<boolean> {
        // For now, require approval for all file writes
        // TODO: Make this configurable via settings
        return true
    }
}

export const diffManager = new DiffManager()
