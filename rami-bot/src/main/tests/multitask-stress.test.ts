
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SynergyManager } from '../organization/synergy-manager'

// Mock dependencies
vi.mock('electron', () => ({
    app: {
        getPath: () => 'temp/test/data',
        on: vi.fn()
    }
}))

vi.mock('../events', () => ({
    appEvents: {
        emit: vi.fn(),
        on: vi.fn(),
        emitAgentActivity: vi.fn()
    }
}))

describe('SynergyManager Multitasking Stress Test', () => {
    let manager: SynergyManager

    beforeEach(() => {
        vi.clearAllMocks()
        manager = new SynergyManager()

        // Mock internal methods to avoid full LLM processing
        // We simulate task execution time to test concurrency
        manager['executeTaskSafe'] = async (task, agent) => {
            task.status = 'in_progress' // Set status to in_progress to account for being active
            return new Promise(resolve => {
                const duration = Math.floor(Math.random() * 400) + 100 // 100-500ms execution
                setTimeout(() => {
                    manager['completeTask'](task.id, { result: 'Success' }, true)
                    resolve()
                }, duration)
            })
        }

        // Mock hiring to always return a dummy agent immediately
        manager['hireAgentForTask'] = async (task) => {
            return manager.createAgent({
                name: `Worker_${Date.now()}`,
                role: 'Worker',
                status: 'idle'
            }, 'system')
        }

        // Initialize config manually since we skip full init
        manager['config'] = {
            name: 'TestOrg',
            mission: 'Test',
            ceoId: 'ceo',
            autoHire: true,
            maxAgents: 100,
            budgetPerAgent: 1000,
            maxConcurrentTasks: 10 // Limit concurrency to 10 for test
        }

        manager['taskQueue'] = []
        manager['tasks'] = new Map()
        manager['agents'] = new Map()
    })

    it('should handle 50 concurrent tasks without crashing', async () => {
        console.log('--- Starting Multitask Stress Test ---')

        // Create 50 tasks
        const taskPromises = []
        for (let i = 0; i < 50; i++) {
            const task = await manager.createTask({
                title: `Stress Task ${i}`,
                description: 'Do something',
                priority: 'medium',
                requiredSkills: ['general']
            })
            taskPromises.push(task)
        }

        expect(manager['taskQueue'].length).toBe(50)

        // Start processing
        const startTime = Date.now()
        let iteration = 0

        while (manager['tasks'].size > 0) {
            // Check if all tasks are completed
            const pendingOrRunning = Array.from(manager['tasks'].values()).filter(t => t.status !== 'completed' && t.status !== 'failed')
            if (pendingOrRunning.length === 0) break

            await manager['processTasks']()

            // Wait small tick to allow "executeTaskSafe" promises to resolve
            await new Promise(r => setTimeout(r, 50))

            iteration++
            if (iteration > 1000) throw new Error('Test timed out - tasks not completing')
        }

        const duration = Date.now() - startTime
        console.log(`Completed 50 tasks in ${duration}ms with max concurrency 10`)

        // Verify all completed
        const completed = Array.from(manager['tasks'].values()).filter(t => t.status === 'completed')
        expect(completed.length).toBe(50)

    }, 30000) // 30s timeout

    it('should respect concurrency limit', async () => {
        // Create 20 tasks
        for (let i = 0; i < 20; i++) {
            await manager.createTask({
                title: `Limit Task ${i}`,
                priority: 'medium',
                requiredSkills: ['general']
            })
        }

        // Run once
        await manager['processTasks']()

        // Check in_progress count
        const inProgress = Array.from(manager['tasks'].values()).filter(t => t.status === 'in_progress')

        // Should differ based on how fast the mocks resolve, 
        // but assuming executeTaskSafe takes > 0ms, we should see up to 10
        console.log(`Active tasks: ${inProgress.length}`)
        expect(inProgress.length).toBeLessThanOrEqual(10)
        expect(inProgress.length).toBeGreaterThan(0) // Should have started some
    })
})
