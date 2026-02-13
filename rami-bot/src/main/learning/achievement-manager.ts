/**
 * Achievement Manager
 * Defines and tracks achievements for agents
 */

import { AgentSkillProfile, Achievement, SkillCategory, SKILL_CATEGORIES } from './types/skill-types'

export interface AchievementDefinition {
    id: string
    name: string
    description: string
    category: SkillCategory | 'general'
    check: (profile: AgentSkillProfile) => boolean
    icon?: string
}

export class AchievementManager {
    private definitions: AchievementDefinition[] = []

    constructor() {
        this.initializeDefinitions()
    }

    /**
     * Define initial achievements
     */
    private initializeDefinitions(): void {
        this.definitions = [
            // General Achievements
            {
                id: 'first_skill',
                name: 'First Steps',
                description: 'Earn your first skill',
                category: 'general',
                check: (p) => Object.keys(p.skills).length > 0
            },
            {
                id: 'skill_collector',
                name: 'Skill Collector',
                description: 'Earn 5 different skills',
                category: 'general',
                check: (p) => Object.keys(p.skills).length >= 5
            },
            {
                id: 'xp_millionaire',
                name: 'XP Millionaire',
                description: 'Earn 1,000 total XP',
                category: 'general',
                check: (p) => p.totalXP >= 1000
            },

            // Level-based Achievements
            {
                id: 'intermediate_specialist',
                name: 'Leveling Up',
                description: 'Reach Intermediate level in any skill',
                category: 'general',
                check: (p) => Object.values(p.skills).some(s => s.level !== 'beginner')
            },
            {
                id: 'master_specialist',
                name: 'Master of One',
                description: 'Reach Master level in any skill',
                category: 'general',
                check: (p) => Object.values(p.skills).some(s => s.level === 'master')
            },

            // Category-specific Achievements
            {
                id: 'coding_wizard',
                name: 'Coding Wizard',
                description: 'Reach Expert level in 3 coding skills',
                category: 'coding',
                check: (p) => {
                    const codingSkills = Object.values(p.skills).filter(s =>
                        ['javascript', 'typescript', 'python', 'java'].includes(s.skillName) &&
                        (s.level === 'expert' || s.level === 'master')
                    )
                    return codingSkills.length >= 3
                }
            },
            {
                id: 'polyglot',
                name: 'Polyglot',
                description: 'Have skills in 4 different categories',
                category: 'general',
                check: (p) => {
                    const categories = new Set(Object.keys(p.skills).map(s => this.getCategory(s)))
                    return categories.size >= 4
                }
            }
        ]
    }

    /**
     * Check for new achievements for an agent
     * @param profile Agent skill profile
     * @returns Array of newly unlocked achievements
     */
    checkAchievements(profile: AgentSkillProfile): Achievement[] {
        const newlyUnlocked: Achievement[] = []
        const currentIds = new Set(profile.achievements.map(a => a.id))

        for (const def of this.definitions) {
            if (!currentIds.has(def.id) && def.check(profile)) {
                newlyUnlocked.push({
                    id: def.id,
                    name: def.name,
                    description: def.description,
                    category: def.category,
                    unlockedAt: Date.now(),
                    icon: def.icon
                })
            }
        }

        return newlyUnlocked
    }

    /**
     * Helper to get category for a skill
     */
    private getCategory(skillName: string): SkillCategory | 'other' {
        for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
            if ((skills as readonly string[]).includes(skillName)) {
                return category as SkillCategory
            }
        }
        return 'other'
    }
}

export const achievementManager = new AchievementManager()
