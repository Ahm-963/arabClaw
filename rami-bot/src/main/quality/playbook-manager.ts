import { patternDetector, FailurePattern } from './pattern-detector'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

/**
 * Playbook Manager
 * Automatically updates internal guides based on failures
 */

export interface Playbook {
    id: string
    title: string
    when: string // Trigger condition
    steps: string[]
    examples: string[]
    pitfalls: string[] // Auto-added from failures
    createdAt: number
    updatedAt: number
}

export class PlaybookManager {
    private playbooks: Map<string, Playbook> = new Map()
    private playbookPath: string

    constructor() {
        const userDataPath = app?.getPath('userData') || '.'
        this.playbookPath = path.join(userDataPath, 'playbooks', 'playbooks.json')
    }

    /**
     * Initialize playbooks
     */
    async initialize(): Promise<void> {
        await fs.mkdir(path.dirname(this.playbookPath), { recursive: true })
        await this.load()
        console.log(`[PlaybookManager] Loaded ${this.playbooks.size} playbooks`)
    }

    /**
     * Create or update a playbook from a single pattern
     */
    async createFromPattern(pattern: FailurePattern): Promise<void> {
        const playbookId = `playbook_${pattern.category}`
        let playbook = this.playbooks.get(playbookId)

        if (!playbook) {
            playbook = {
                id: playbookId,
                title: `How to Handle ${pattern.category} Issues`,
                when: `When encountering ${pattern.category} problems`,
                steps: [],
                examples: [],
                pitfalls: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
            this.playbooks.set(playbookId, playbook)
        }

        const pitfall = this.generatePitfall(pattern)
        if (!playbook.pitfalls.includes(pitfall)) {
            playbook.pitfalls.push(pitfall)
            playbook.updatedAt = Date.now()
        }
        await this.save()
    }

    /**
     * Manually add a pitfall to a playbook
     */
    async addPitfall(id: string, pitfall: string): Promise<void> {
        const playbook = this.playbooks.get(id)
        if (playbook && !playbook.pitfalls.includes(pitfall)) {
            playbook.pitfalls.push(pitfall)
            playbook.updatedAt = Date.now()
            await this.save()
        }
    }

    /**
     * Auto-update playbooks from failure patterns
     */
    async updateFromPatterns(): Promise<number> {
        const patterns = patternDetector.getPatterns()
        let updated = 0

        for (const pattern of patterns) {
            const playbookId = `playbook_${pattern.category}`
            let playbook = this.playbooks.get(playbookId)

            if (!playbook) {
                // Create new playbook
                playbook = {
                    id: playbookId,
                    title: `How to Handle ${pattern.category} Issues`,
                    when: `When encountering ${pattern.category} problems`,
                    steps: [],
                    examples: [],
                    pitfalls: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
                this.playbooks.set(playbookId, playbook)
            }

            // Add pitfall if not already present
            const pitfall = this.generatePitfall(pattern)
            if (!playbook.pitfalls.includes(pitfall)) {
                playbook.pitfalls.push(pitfall)
                playbook.updatedAt = Date.now()
                updated++
                console.log(`[PlaybookManager] Updated ${playbookId} with new pitfall`)
            }
        }

        if (updated > 0) {
            await this.save()
        }

        return updated
    }

    /**
     * Generate pitfall description from pattern
     */
    private generatePitfall(pattern: FailurePattern): string {
        return `⚠️ ${pattern.description} (${pattern.occurrences} times). Last seen: ${new Date(pattern.lastSeen).toISOString()}`
    }

    /**
     * Get a playbook
     */
    getPlaybook(id: string): Playbook | undefined {
        return this.playbooks.get(id)
    }

    /**
     * Get all playbooks
     */
    getAllPlaybooks(): Playbook[] {
        return Array.from(this.playbooks.values())
    }

    /**
     * Load playbooks from disk
     */
    private async load(): Promise<void> {
        try {
            const data = await fs.readFile(this.playbookPath, 'utf-8')
            const loaded = JSON.parse(data)
            this.playbooks = new Map(Object.entries(loaded))
        } catch {
            // File doesn't exist yet
        }
    }

    /**
     * Save playbooks to disk
     */
    private async save(): Promise<void> {
        const data = Object.fromEntries(this.playbooks)
        await fs.writeFile(this.playbookPath, JSON.stringify(data, null, 2), 'utf-8')
    }
}

export const playbookManager = new PlaybookManager()
