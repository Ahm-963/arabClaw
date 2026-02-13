import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface SubTask {
    id: string
    description: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    priority: number // 1 (high) to 5 (low)
    dependencies?: string[] // IDs of tasks that must be done first
}

export interface Goal {
    id: string
    description: string
    subtasks: SubTask[]
    status: 'active' | 'completed' | 'failed'
    createdAt: number
    updatedAt: number
}

class GoalManager {
    private goals: Map<string, Goal> = new Map()
    private dataPath: string
    private initialized = false

    constructor() {
        this.dataPath = path.join(app?.getPath('userData') || '.', 'goals')
    }

    async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            await fs.mkdir(this.dataPath, { recursive: true })
            await this.loadGoals()
            this.initialized = true
            console.log(`[GoalManager] Initialized with ${this.goals.size} active goals`)
        } catch (error: any) {
            console.error('[GoalManager] Init error:', error.message)
        }
    }

    async createGoal(description: string): Promise<Goal> {
        const id = `goal_${Date.now()}`
        const goal: Goal = {
            id,
            description,
            subtasks: [],
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        this.goals.set(id, goal)
        await this.saveGoals()
        return goal
    }

    async addSubtasks(goalId: string, tasks: Array<{ description: string; priority?: number }>): Promise<Goal | null> {
        const goal = this.goals.get(goalId)
        if (!goal) return null

        tasks.forEach(t => {
            goal.subtasks.push({
                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                description: t.description,
                status: 'pending',
                priority: t.priority || 3
            })
        })

        goal.updatedAt = Date.now()
        this.goals.set(goalId, goal)
        await this.saveGoals()
        return goal
    }

    async updateTaskStatus(goalId: string, taskId: string, status: SubTask['status']): Promise<boolean> {
        const goal = this.goals.get(goalId)
        if (!goal) return false

        const task = goal.subtasks.find(t => t.id === taskId)
        if (!task) return false

        task.status = status
        goal.updatedAt = Date.now()

        // Check if all completed
        if (goal.subtasks.every(t => t.status === 'completed')) {
            goal.status = 'completed'
        }

        this.goals.set(goalId, goal)
        await this.saveGoals()
        return true
    }

    async getActiveGoal(): Promise<Goal | undefined> {
        // Return the most recently updated active goal
        return Array.from(this.goals.values())
            .filter(g => g.status === 'active')
            .sort((a, b) => b.updatedAt - a.updatedAt)[0]
    }

    private async loadGoals(): Promise<void> {
        try {
            const data = await fs.readFile(path.join(this.dataPath, 'goals.json'), 'utf-8')
            const goals: Goal[] = JSON.parse(data)
            goals.forEach(g => this.goals.set(g.id, g))
        } catch (e) { }
    }

    private async saveGoals(): Promise<void> {
        const data = Array.from(this.goals.values())
        await fs.writeFile(path.join(this.dataPath, 'goals.json'), JSON.stringify(data, null, 2))
    }
}

export const goalManager = new GoalManager()
