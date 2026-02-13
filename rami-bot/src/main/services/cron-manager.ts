import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { executeCommand } from '../tools/bash'
import { isCronMatch } from '../utils/cron'

export interface CronTask {
    id: string
    name: string
    schedule?: string // Optional for one-time tasks
    timestamp?: number // For one-time tasks
    type: 'recurring' | 'one-time'
    command: string
    enabled: boolean
    lastRun?: number
    lastResult?: string
}

export class CronManager {
    private tasks: Map<string, CronTask> = new Map()
    private filePath: string
    private intervalId: NodeJS.Timeout | null = null

    constructor() {
        this.filePath = path.join(app.getPath('userData'), 'cron-tasks.json')
    }

    async initialize(): Promise<void> {
        await this.loadTasks()
        this.startScheduler()
        console.log('[CronManager] Initialized with', this.tasks.size, 'tasks')
    }

    private async loadTasks(): Promise<void> {
        try {
            const content = await fs.readFile(this.filePath, 'utf-8')
            const tasks: CronTask[] = JSON.parse(content)
            tasks.forEach(task => this.tasks.set(task.id, task))
        } catch {
            // File doesn't exist or invalid, start empty
            this.tasks.clear()
        }
    }

    private async saveTasks(): Promise<void> {
        try {
            const tasks = Array.from(this.tasks.values())
            await fs.writeFile(this.filePath, JSON.stringify(tasks, null, 2), 'utf-8')
        } catch (error) {
            console.error('[CronManager] Failed to save tasks:', error)
        }
    }

    async addTask(name: string, command: string, type: 'recurring' | 'one-time', schedule?: string, timestamp?: number): Promise<CronTask> {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
        const task: CronTask = {
            id,
            name,
            command,
            type,
            schedule,
            timestamp,
            enabled: true
        }
        this.tasks.set(id, task)
        await this.saveTasks()
        console.log('[CronManager] Added task:', name, 'Type:', type)
        return task
    }

    async removeTask(id: string): Promise<boolean> {
        if (this.tasks.delete(id)) {
            await this.saveTasks()
            return true
        }
        return false
    }

    async toggleTask(id: string, enabled: boolean): Promise<boolean> {
        const task = this.tasks.get(id)
        if (task) {
            task.enabled = enabled
            await this.saveTasks()
            return true
        }
        return false
    }

    getTasks(): CronTask[] {
        return Array.from(this.tasks.values())
    }

    private startScheduler() {
        // Check every minute
        this.intervalId = setInterval(() => {
            this.checkTasks()
        }, 60000)

        // Initial check (in case we started exactly on the minute)
        this.checkTasks()
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
    }

    private checkTasks() {
        const now = new Date()
        const nowMs = now.getTime()

        for (const task of this.tasks.values()) {
            if (!task.enabled) continue

            let shouldRun = false
            if (task.type === 'recurring' && task.schedule) {
                shouldRun = isCronMatch(task.schedule, now)
            } else if (task.type === 'one-time' && task.timestamp) {
                // Run if we are past the timestamp and haven't run yet
                shouldRun = nowMs >= task.timestamp && (!task.lastRun || task.lastRun < task.timestamp)
            }

            if (shouldRun) {
                this.executeTask(task)
                // If it's a one-time task, disable it after starting execution
                if (task.type === 'one-time') {
                    task.enabled = false
                }
            }
        }
    }

    private async executeTask(task: CronTask) {
        console.log(`[CronManager] Executing task: ${task.name}`)
        try {
            // We assume command is a shell command or internal bot command
            // For now, let's support bash commands
            const result = await executeCommand(task.command)
            task.lastRun = Date.now()
            task.lastResult = result.success ? 'Success' : `Error: ${result.error}`
            await this.saveTasks()
        } catch (error: any) {
            console.error(`[CronManager] Task execution failed: ${task.name}`, error)
            task.lastRun = Date.now()
            task.lastResult = `Exception: ${error.message}`
            await this.saveTasks()
        }
    }
}

export const cronManager = new CronManager()
