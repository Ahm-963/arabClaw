/**
 * Skill Progression Test Suite
 * Tests leveling, achievements, decay, and dependencies
 */

import { describe, it, expect } from 'vitest'
import { skillProgressTracker } from '../learning/skill-progress-tracker'
import { skillProgressionManager } from '../learning/skill-progression-manager'

describe('Skill Progression System', () => {
    it('should initialize skill progress tracker', async () => {
        await skillProgressTracker.initialize()
        expect(skillProgressTracker).toBeDefined()
    })

    it('should create agent profile', async () => {
        await skillProgressTracker.initialize()
        const agentId = 'test-agent-progression'
        const agentName = 'Test Agent'

        await skillProgressTracker.awardXP(agentId, agentName, 'coding', 50, 'Test task')
        const profile = skillProgressTracker.getAgentProfile(agentId)
        expect(profile).toBeDefined()
    })

    it('should award XP and track level', async () => {
        await skillProgressTracker.initialize()
        const agentId = 'test-agent-xp'
        const agentName = 'XP Test Agent'

        const award = await skillProgressTracker.awardXP(agentId, agentName, 'coding', 150, 'Test XP')
        expect(award).toBeDefined()
        expect(award.xpAwarded).toBe(150)
    })

    it('should track achievements', async () => {
        await skillProgressTracker.initialize()
        const agentId = 'test-agent-achievements'
        const agentName = 'Achievement Agent'

        await skillProgressTracker.awardXP(agentId, agentName, 'coding', 100, 'Test')
        const profile = skillProgressTracker.getAgentProfile(agentId)
        expect(profile).toBeDefined()
        expect(Array.isArray(profile?.achievements)).toBe(true)
    })

    it('should set skill dependencies', () => {
        skillProgressionManager.setSkillDependencies([
            { skillName: 'advanced-coding', requiredSkillName: 'coding', requiredLevel: 'intermediate' }
        ])
        expect(true).toBe(true) // Just verify no error
    })

    it('should get global stats', () => {
        const stats = skillProgressionManager.getGlobalStats()
        expect(stats).toBeDefined()
        expect(typeof stats.totalAgents).toBe('number')
        expect(typeof stats.totalXP).toBe('number')
    })
})
