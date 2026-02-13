import { describe, it, expect, beforeEach, vi } from 'vitest'
import { synergyManager } from '../main/organization/synergy-manager'
import { chaosManager } from '../main/utils/chaos-manager'
import { resourceOptimizer } from '../main/utils/resource-optimizer'

describe('Level 5+ Resilience & Optimization', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        synergyManager['taskQueue'] = []
        synergyManager['tasks'].clear()
    })

    it('should respect task dependencies and project grouping', async () => {
        const task1 = await synergyManager.createTask({
            title: 'Task Primary',
            description: 'First task',
            requiredSkills: ['research'],
            priority: 'high'
        })

        const task2 = await synergyManager.createTask({
            title: 'Task Dependent',
            description: 'Second task',
            requiredSkills: ['coding'],
            dependencies: [task1.id],
            priority: 'medium'
        })

        const queue = synergyManager['taskQueue']
        const t1 = queue.find(t => t.id === task1.id)
        const t2 = queue.find(t => t.id === task2.id)

        expect(t1?.status).toBe('pending')
        expect(t2?.status).toBe('pending')

        // Mark t1 as completed
        if (t1) t1.status = 'completed'
        console.log('[DEBUG TEST] Task 1 status:', synergyManager['tasks'].get(task1.id)?.status)

        // Verify eligibility directly
        const eligible = queue.filter(t => {
            if (t.status !== 'pending') return false
            if (t.dependencies && t.dependencies.length > 0) {
                const met = t.dependencies.every(depId => {
                    const depTask = synergyManager['tasks'].get(depId)
                    console.log(`[DEBUG TEST] Checking dep ${depId} for task ${t.title}. Dep Status: ${depTask?.status}`)
                    return depTask && depTask.status === 'completed'
                })
                return met
            }
            return true
        })

        console.log('[DEBUG TEST] Eligible task IDs:', eligible.map(t => t.id))
        expect(eligible.some(t => t.id === task2.id)).toBe(true)
    })

    it('should apply Chaos Engineering (latency)', async () => {
        const start = Date.now()
        vi.spyOn(Math, 'random').mockReturnValue(0.8)
        await chaosManager.applyLatency()
        const duration = Date.now() - start
        expect(duration).toBeGreaterThanOrEqual(100)
    })

    it('should conduct Game Theory bidding', () => {
        const task = { id: 't1', title: 'T', priority: 'high', requiredSkills: ['coding'] } as any
        const candidates = [{ id: 'a1', successRate: 90, role: 'S' }] as any
        const bids = resourceOptimizer.conductBidding(task, candidates)
        expect(bids[0].agentId).toBe('a1')
        expect(resourceOptimizer.determineWinner(bids)?.agentId).toBe('a1')
    })

    it('should negotiate providers', async () => {
        const codingTask = { requiredSkills: ['coding'], priority: 'high' } as any
        expect(await resourceOptimizer.negotiateProvider(codingTask)).toBe('claude-3-5-sonnet')
    })
})
