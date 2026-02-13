/**
 * Comprehensive test suite for Rami Bot Synergy Manager
 * Tests all core features including dynamic agent creation
 */

import { describe, it, expect } from 'vitest'
import { SynergyManager } from '../organization/synergy-manager'

describe('Rami Bot Features', () => {
    it('should initialize Synergy Manager', async () => {
        const manager = new SynergyManager()
        await manager.initialize()
        expect(manager).toBeDefined()
    })

    it('should create default organization with agents', async () => {
        const manager = new SynergyManager()
        await manager.initialize()
        const agents = Array.from((manager as any)['agents'].values())
        expect(agents.length).toBeGreaterThanOrEqual(5)
    })

    it('should have CEO agent', async () => {
        const manager = new SynergyManager()
        await manager.initialize()
        const agents = Array.from((manager as any)['agents'].values()) as any[]
        const ceo = agents.find(a => a.level === 'ceo')
        expect(ceo).toBeDefined()
    })

    it('should have CodeMaster agent', async () => {
        const manager = new SynergyManager()
        await manager.initialize()
        const agents = Array.from((manager as any)['agents'].values()) as any[]
        const codeMaster = agents.find(a => a.name === 'CodeMaster')
        expect(codeMaster).toBeDefined()
    })

    it('should have Scholar agent', async () => {
        const manager = new SynergyManager()
        await manager.initialize()
        const agents = Array.from((manager as any)['agents'].values()) as any[]
        const scholar = agents.find(a => a.name === 'Scholar')
        expect(scholar).toBeDefined()
    })

    it('should create tasks', async () => {
        const manager = new SynergyManager()
        await manager.initialize()

        const task = await manager.createTask({
            title: 'Test Task',
            description: 'Test description',
            priority: 'high',
            department: 'engineering',
            requiredSkills: ['coding'],
            assignedBy: 'test-suite'
        })

        expect(task.id).toBeDefined()
        expect(task.status).toBe('pending')
    })

    it('should find best agent for coding task', async () => {
        const manager = new SynergyManager()
        await manager.initialize()

        const codingTask = await manager.createTask({
            title: 'Build REST API',
            description: 'Create Express.js REST API',
            priority: 'high',
            department: 'engineering',
            requiredSkills: ['coding', 'api-integration'],
            assignedBy: 'test-suite'
        })

        const bestAgent = (manager as any)['findBestAgent'](codingTask)
        expect(bestAgent).toBeDefined()
    })

    it('should have all required agent properties', async () => {
        const manager = new SynergyManager()
        await manager.initialize()

        const allAgents = Array.from((manager as any)['agents'].values()) as any[]
        const hasAllProperties = allAgents.every(a =>
            a.id && a.name && a.role && a.department && a.level &&
            Array.isArray(a.skills) && a.systemPrompt
        )
        expect(hasAllProperties).toBe(true)
    })

    it('should have unique agent IDs', async () => {
        const manager = new SynergyManager()
        await manager.initialize()

        const allAgents = Array.from((manager as any)['agents'].values()) as any[]
        const ids = allAgents.map(a => a.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
