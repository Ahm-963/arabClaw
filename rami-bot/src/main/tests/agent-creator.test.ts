/**
 * Agent Creator Integration Test Suite
 * Tests SynergyManager agent creation, deletion, and protection
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { synergyManager } from '../organization/synergy-manager'
import { agentRegistry } from '../agents/registry'

describe('Agent Creator & Management Verification', () => {
    beforeAll(async () => {
        await synergyManager.initialize()
    })

    describe('Agent Creation', () => {
        it('should create a new specialized agent', async () => {
            const agent = await synergyManager.createAgent({
                name: 'Test Agent',
                role: 'tester',
                department: 'engineering',
                level: 'junior',
                skills: ['testing', 'debugging'],
                personality: 'Rigorous',
                systemPrompt: 'You are a testing agent.'
            }, 'user')

            expect(agent).toHaveProperty('id')
            expect(agent.name).toBe('Test Agent')
            expect(agent.department).toBe('engineering')

            const retrieved = (synergyManager as any).agents.get(agent.id)
            expect(retrieved).toBeDefined()
        })
    })

    describe('Core Agent Protection', () => {
        it('should prevent termination of CEO (Rami)', async () => {
            const ceo = Array.from((synergyManager as any).agents.values()).find((a: any) => a.level === 'ceo')
            expect(ceo).toBeDefined()

            if (ceo) {
                const success = await synergyManager.terminateAgent((ceo as any).id, 'Reason', 'user')
                expect(success).toBe(false)

                // Ensure it still exists
                expect((synergyManager as any).agents.get((ceo as any).id)).toBeDefined()
            }
        })

        it('should prevent termination of CyberGuard', async () => {
            const guard = Array.from((synergyManager as any).agents.values()).find((a: any) => (a as any).name === 'CyberGuard')
            expect(guard).toBeDefined()

            if (guard) {
                const success = await synergyManager.terminateAgent((guard as any).id, 'Reason', 'user')
                expect(success).toBe(false)

                // Ensure it still exists
                expect((synergyManager as any).agents.get((guard as any).id)).toBeDefined()
            }
        })
    })

    describe('Agent Deletion', () => {
        it('should allow terminating a non-core agent', async () => {
            const agent = await synergyManager.createAgent({
                name: 'Temporary Agent',
                role: 'temp',
                level: 'junior'
            }, 'user')

            const success = await synergyManager.terminateAgent(agent.id, 'Finished task', 'user')
            expect(success).toBe(true)

            const retrieved = (synergyManager as any).agents.get(agent.id)
            expect(retrieved).toBeUndefined()
        })
    })
})
