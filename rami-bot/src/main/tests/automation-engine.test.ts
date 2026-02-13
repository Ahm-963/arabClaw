/**
 * Automation Engine Integration Test Suite
 * Tests WorkflowEngine, CronManager, and scheduling logic
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { workflowEngine } from '../automation/workflow-engine'
import { isCronMatch } from '../utils/cron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { synergyManager } from '../organization/synergy-manager'
import { vi } from 'vitest'

describe('Automation Engine & Cron Verification', () => {
    const testDate = new Date('2026-02-11T09:00:00') // Wednesday Feb 11, 2026, 9:00 AM

    beforeAll(async () => {
        // Mock securityAudit to always pass
        vi.spyOn(synergyManager, 'securityAudit').mockResolvedValue({ safe: true, issues: [], recommendations: [] })

        // Ensure workflow directory exists for persistence test
        const workflowDir = path.join(app?.getPath('userData') || './temp/userData', 'workflows')
        await fs.mkdir(workflowDir, { recursive: true })

        await workflowEngine.initialize()
    })

    describe('Cron Utility (isCronMatch)', () => {
        it('should match simple wildcard * * * * *', () => {
            expect(isCronMatch('* * * * *', testDate)).toBe(true)
        })

        it('should match specific minute', () => {
            expect(isCronMatch('0 * * * *', testDate)).toBe(true)
            expect(isCronMatch('1 * * * *', testDate)).toBe(false)
        })

        it('should match specific hour', () => {
            expect(isCronMatch('* 9 * * *', testDate)).toBe(true)
            expect(isCronMatch('* 10 * * *', testDate)).toBe(false)
        })

        it('should match day of week (Wednesday = 3)', () => {
            expect(isCronMatch('* * * * 3', testDate)).toBe(true)
            expect(isCronMatch('* * * * 4', testDate)).toBe(false)
        })

        it('should match lists (e.g., 0,30)', () => {
            expect(isCronMatch('0,30 * * * *', testDate)).toBe(true)
            expect(isCronMatch('5,15 * * * *', testDate)).toBe(false)
        })

        it('should match steps (e.g., */15)', () => {
            expect(isCronMatch('*/15 * * * *', testDate)).toBe(true) // 0 % 15 == 0

            const stepDate = new Date(testDate)
            stepDate.setMinutes(10)
            expect(isCronMatch('*/15 * * * *', stepDate)).toBe(false) // 10 % 15 != 0

            stepDate.setMinutes(30)
            expect(isCronMatch('*/15 * * * *', stepDate)).toBe(true) // 30 % 15 == 0
        })

        it('should match complex patterns (9 AM on Wednesdays)', () => {
            expect(isCronMatch('0 9 * * 3', testDate)).toBe(true)
        })
    })

    describe('Workflow Engine Execution', () => {
        it('should create and load workflows', async () => {
            const wf = await workflowEngine.createWorkflow({
                name: 'Test Workflow',
                trigger: { type: 'manual', config: {} },
                steps: [
                    { id: 's1', name: 'Wait', type: 'wait', config: { duration: 10 } }
                ]
            })

            expect(wf).toHaveProperty('id')
            expect(wf.name).toBe('Test Workflow')

            const loaded = workflowEngine.getWorkflow(wf.id)
            expect(loaded).toBeDefined()
            expect(loaded?.name).toBe('Test Workflow')
        })

        it('should execute manual workflow', async () => {
            const wf = await workflowEngine.createWorkflow({
                name: 'Exec Workflow',
                trigger: { type: 'manual', config: {} },
                steps: [
                    { id: 's1', name: 'Wait', type: 'wait', config: { duration: 10 } }
                ]
            })

            const run = await workflowEngine.runWorkflow(wf.id)
            expect(run.status).toBe('completed')
            expect(run.results).toHaveProperty('s1')
        })

        it('should handle step interpolation', async () => {
            const wf = await workflowEngine.createWorkflow({
                name: 'Interpolation Test',
                variables: { test_var: 'success' },
                steps: [
                    { id: 's1', name: 'Output', type: 'output', config: { template: 'Result: {{test_var}}' } }
                ]
            })

            const run = await workflowEngine.runWorkflow(wf.id)
            expect(run.results.s1).toBe('Result: success')
        })
    })

    describe('Persistence Verification', () => {
        it('should persist workflows to disk', async () => {
            const wf = await workflowEngine.createWorkflow({
                name: 'Persistent WF',
                trigger: { type: 'manual', config: {} },
                steps: []
            })

            // Check if file exists in userData/workflows/workflows.json
            const dataPath = path.join(app?.getPath('userData') || './temp/userData', 'workflows', 'workflows.json')

            // Wait a bit for file write if necessary
            await new Promise(resolve => setTimeout(resolve, 100))

            const data = await fs.readFile(dataPath, 'utf-8')
            const workflows = JSON.parse(data)

            const found = workflows.find((w: any) => w.id === wf.id)
            expect(found).toBeDefined()
            expect(found.name).toBe('Persistent WF')
        })
    })
})
