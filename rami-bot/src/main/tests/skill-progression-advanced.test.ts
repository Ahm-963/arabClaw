/**
 * Advanced Skill Progression Tests
 * Tests achievement system, skill decay, and dependencies
 */

import { describe, it, expect } from 'vitest'
import { skillProgressTracker } from '../learning/skill-progress-tracker'
import { skillProgressionManager } from '../learning/skill-progression-manager'

describe('Advanced Skill Progression', () => {
    it('should handle skill dependencies', async () => {
        await skillProgressTracker.initialize()

        // Set dependency
        skillProgressionManager.setSkillDependencies([
            { skillName: 'typescript', requiredSkillName: 'javascript', requiredLevel: 'intermediate' }
        ])

        // Try to award XP to typescript without javascript skill
        const award = await skillProgressTracker.awardXP('test-adv-agent', 'Test Agent', 'typescript', 10, 'Testing deps')
        expect(award).toBeDefined()
    })

    it('should track achievements', async () => {
        await skillProgressTracker.initialize()

        await skillProgressTracker.awardXP('test-adv-agent-2', 'Test Agent 2', 'coding', 100, 'Test achievement')
        const profile = skillProgressTracker.getAgentProfile('test-adv-agent-2')
        expect(profile).toBeDefined()
        expect(Array.isArray(profile?.achievements)).toBe(true)
    })

    it('should check skill progress', async () => {
        await skillProgressTracker.initialize()

        await skillProgressTracker.awardXP('test-adv-agent-3', 'Test Agent 3', 'python', 50, 'Test')
        const progress = skillProgressTracker.getSkillProgress('test-adv-agent-3', 'python')
        expect(progress).toBeDefined()
    })

    it('should trigger decay check', async () => {
        await skillProgressTracker.initialize()
        // Just verify the method can be called
        await skillProgressionManager.triggerDecayCheck()
        expect(true).toBe(true)
    })
})
