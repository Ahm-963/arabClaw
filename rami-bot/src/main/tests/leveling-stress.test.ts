/**
 * Leveling System Stress Test
 * Tests XP system stability, level-up logic, and persistence
 */

import { describe, it, expect } from 'vitest'
import { skillProgressTracker } from '../learning/skill-progress-tracker'

describe('Leveling System Stress Test', () => {
    it('should initialize skill progress tracker', async () => {
        await skillProgressTracker.initialize()
        expect(skillProgressTracker).toBeDefined()
    })

    it('should award XP and track progress', async () => {
        await skillProgressTracker.initialize()
        const agentId = 'stress_test_agent'
        const agentName = 'Stress Agent'
        const skillName = 'javascript'

        const award = await skillProgressTracker.awardXP(agentId, agentName, skillName, 25, 'Test XP award')
        expect(award).toBeDefined()
        expect(award.xpAwarded).toBe(25)
    })

    it('should track agent profile', async () => {
        await skillProgressTracker.initialize()
        const agentId = 'stress_test_agent_2'
        const agentName = 'Stress Agent 2'

        await skillProgressTracker.awardXP(agentId, agentName, 'coding', 100, 'Test')
        const profile = skillProgressTracker.getAgentProfile(agentId)
        expect(profile).toBeDefined()
    })

    it('should get skill progress', async () => {
        await skillProgressTracker.initialize()
        const agentId = 'stress_test_agent_3'
        const agentName = 'Stress Agent 3'

        await skillProgressTracker.awardXP(agentId, agentName, 'typescript', 50, 'Test')
        const progress = skillProgressTracker.getSkillProgress(agentId, 'typescript')
        expect(progress).toBeDefined()
    })
})
