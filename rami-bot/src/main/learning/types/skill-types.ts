/**
 * Skill Progression Types
 * Defines skill levels, progress tracking, and agent profiles
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'

export interface SkillProgress {
    skillName: string
    level: SkillLevel
    currentXP: number // XP in current level
    totalXP: number // Total XP earned
    xpToNextLevel: number // XP needed for next level
    tasksCompleted: number
    lastUsed: number // Timestamp
    firstUsed: number // Timestamp
}

export interface Achievement {
    id: string
    name: string
    description: string
    category: SkillCategory | 'general'
    unlockedAt: number
    icon?: string
    metadata?: Record<string, any>
}

export interface SkillDependency {
    skillName: string
    requiredSkillName: string
    requiredLevel: SkillLevel
}

export interface SkillDecayConfig {
    enabled: boolean
    idleDaysThreshold: number // Days before decay starts
    decayRatePerDay: number // XP lost per day
    minLevel: SkillLevel // Decay won't drop skill below this
}

export interface AgentSkillProfile {
    agentId: string
    agentName: string
    skills: Record<string, SkillProgress> // skillName -> progress
    achievements: Achievement[]
    totalXP: number
    totalTasksCompleted: number
    createdAt: number
    updatedAt: number
}

export interface SkillXPAward {
    agentId: string
    skillName: string
    xpAwarded: number
    reason: string
    timestamp: number
    previousLevel: SkillLevel
    newLevel: SkillLevel
    leveledUp: boolean
}

// XP thresholds for each level
export const XP_THRESHOLDS: Record<SkillLevel, number> = {
    beginner: 0,
    intermediate: 100,
    advanced: 350, // 100 + 250
    expert: 850, // 350 + 500
    master: 1850 // 850 + 1000
}

// XP required to advance from current level
export const XP_TO_NEXT_LEVEL: Record<SkillLevel, number> = {
    beginner: 100,
    intermediate: 250,
    advanced: 500,
    expert: 1000,
    master: 0 // Already at max
}

// Default skill decay configuration
export const DEFAULT_DECAY_CONFIG: SkillDecayConfig = {
    enabled: true,
    idleDaysThreshold: 7,
    decayRatePerDay: 5,
    minLevel: 'intermediate'
}

// Skill categories for organization
export const SKILL_CATEGORIES = {
    coding: ['javascript', 'typescript', 'python', 'java', 'cpp', 'rust', 'go'],
    web: ['html', 'css', 'react', 'vue', 'angular', 'frontend', 'backend'],
    systems: ['linux', 'docker', 'kubernetes', 'devops', 'terminal', 'bash'],
    database: ['sql', 'mongodb', 'postgresql', 'redis', 'database'],
    tools: ['git', 'debugging', 'testing', 'refactoring', 'code-review'],
    research: ['web-search', 'documentation', 'analysis', 'investigation'],
    communication: ['writing', 'explaining', 'documentation', 'presentation'],
    domain: ['ai', 'ml', 'security', 'networking', 'algorithms']
} as const

export type SkillCategory = keyof typeof SKILL_CATEGORIES
