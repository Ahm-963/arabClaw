/**
 * Skill Progression Manager
 * High-level manager for skill progression, recommendations, and analytics
 */

import { skillProgressTracker } from './skill-progress-tracker'
import {
    AgentSkillProfile,
    SkillProgress,
    SkillLevel,
    SKILL_CATEGORIES,
    SkillCategory,
    Achievement,
    SkillDependency
} from './types/skill-types'
import { achievementManager } from './achievement-manager'

/**
 * Skill Progression Manager Class
 * Manages skill progression, recommendations, and analytics
 */
export class SkillProgressionManager {
    /**
     * Initialize the skill progression manager
     */
    async initialize(): Promise<void> {
        await skillProgressTracker.initialize()
        console.log('[SkillProgressionManager] Initialized')
    }

    /**
     * Award XP for task completion
     * Automatically determines skills used and awards appropriate XP
     * @param agentId Agent ID
     * @param agentName Agent name
     * @param taskType Type of task completed
     * @param success Whether task was successful
     * @param toolsUsed Tools/skills used in the task
     */
    async awardTaskXP(
        agentId: string,
        agentName: string,
        taskType: string,
        success: boolean,
        toolsUsed: string[] = []
    ): Promise<void> {
        // Base XP amount
        const baseXP = success ? 10 : 5

        // Award XP for each tool/skill used
        for (const tool of toolsUsed) {
            const skillName = this.mapToolToSkill(tool)
            const xpAmount = this.calculateXPAmount(baseXP, success)

            await skillProgressTracker.awardXP(
                agentId,
                agentName,
                skillName,
                xpAmount,
                `Completed ${taskType} task`
            )
        }

        // Award XP for task type skill
        const taskSkill = this.mapTaskTypeToSkill(taskType)
        if (taskSkill) {
            await skillProgressTracker.awardXP(
                agentId,
                agentName,
                taskSkill,
                baseXP * 2, // Double XP for main task skill
                `Completed ${taskType} task`
            )
        }
    }

    /**
     * Get skill recommendations for an agent
     * @param agentId Agent ID
     * @returns Recommended skills to improve
     */
    getSkillRecommendations(agentId: string): {
        skillName: string
        reason: string
        priority: 'high' | 'medium' | 'low'
    }[] {
        const profile = skillProgressTracker.getAgentProfile(agentId)
        if (!profile) return []

        const recommendations: {
            skillName: string
            reason: string
            priority: 'high' | 'medium' | 'low'
        }[] = []

        // Find skill gaps (skills in same category with low levels)
        const skillsByCategory = this.groupSkillsByCategory(profile)

        for (const [category, skills] of Object.entries(skillsByCategory)) {
            const avgLevel = this.calculateAverageLevel(skills)
            const lowSkills = skills.filter(s => this.getLevelValue(s.level) < this.getLevelValue(avgLevel))

            for (const skill of lowSkills) {
                recommendations.push({
                    skillName: skill.skillName,
                    reason: `Below average in ${category} category`,
                    priority: 'medium'
                })
            }
        }

        // Recommend skills that haven't been used recently
        const allSkills = Object.values(profile.skills)
        const staleSkills = allSkills.filter(s => {
            const daysSinceUse = (Date.now() - s.lastUsed) / (1000 * 60 * 60 * 24)
            return daysSinceUse > 7 // Not used in 7 days
        })

        for (const skill of staleSkills) {
            recommendations.push({
                skillName: skill.skillName,
                reason: 'Not used recently, may need practice',
                priority: 'low'
            })
        }

        return recommendations.slice(0, 5) // Return top 5
    }

    /**
     * Get skill progression report for an agent
     * @param agentId Agent ID
     * @returns Skill progression report
     */
    async getProgressionReport(agentId: string) {
        const profile = skillProgressTracker.getAgentProfile(agentId)
        if (!profile) return null

        const topSkills = skillProgressTracker.getTopSkills(agentId, 5)
        const recommendations = this.getSkillRecommendations(agentId)

        return {
            agentId: profile.agentId,
            agentName: profile.agentName,
            totalXP: profile.totalXP,
            totalTasksCompleted: profile.totalTasksCompleted,
            totalSkills: Object.keys(profile.skills).length,
            topSkills,
            recommendations,
            achievements: profile.achievements,
            skillDistribution: this.getSkillDistribution(profile),
            lastDecayCheck: profile.updatedAt,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt
        }
    }

    /**
     * Get global skill statistics across all agents
     */
    getGlobalStats() {
        return skillProgressTracker.getGlobalStats()
    }

    /**
     * Get all agent profiles
     */
    getAllProfiles() {
        return skillProgressTracker.getAllProfiles()
    }

    /**
     * Get all available achievements
     */
    getAchievements(agentId: string): Achievement[] {
        const profile = skillProgressTracker.getAgentProfile(agentId)
        return profile?.achievements || []
    }

    /**
     * Set skill dependencies (e.g., 'typescript' requires 'javascript' level 'intermediate')
     */
    setSkillDependencies(dependencies: SkillDependency[]): void {
        skillProgressTracker.setDependencies(dependencies)
    }

    /**
     * Manually trigger decay check
     */
    async triggerDecayCheck(): Promise<void> {
        await skillProgressTracker.applyAllDecay()
    }

    /**
     * Map tool name to skill name
     * @param toolName Tool name
     * @returns Skill name
     */
    private mapToolToSkill(toolName: string): string {
        const toolSkillMap: Record<string, string> = {
            'bash': 'terminal',
            'str_replace_editor': 'coding',
            'web_search': 'research',
            'screenshot': 'vision',
            'mouse_move': 'computer-control',
            'mouse_click': 'computer-control',
            'type_text': 'computer-control',
            'download_file': 'web',
            'open_url': 'web',
            'github_create_repo': 'git',
            'github_create_issue': 'git'
        }

        return toolSkillMap[toolName] || toolName
    }

    /**
     * Map task type to skill name
     * @param taskType Task type
     * @returns Skill name or null
     */
    private mapTaskTypeToSkill(taskType: string): string | null {
        const taskSkillMap: Record<string, string> = {
            'coding': 'coding',
            'research': 'research',
            'debugging': 'debugging',
            'testing': 'testing',
            'documentation': 'documentation',
            'refactoring': 'refactoring',
            'security-audit': 'security',
            'code-review': 'code-review'
        }

        return taskSkillMap[taskType] || null
    }

    /**
     * Calculate XP amount based on success and other factors
     * @param baseXP Base XP amount
     * @param success Whether task was successful
     * @returns Calculated XP amount
     */
    private calculateXPAmount(baseXP: number, success: boolean): number {
        let xp = baseXP
        if (!success) xp = Math.floor(xp * 0.5) // Half XP for failures
        return Math.max(1, xp) // Minimum 1 XP
    }

    /**
     * Group skills by category
     * @param profile Agent skill profile
     * @returns Skills grouped by category
     */
    private groupSkillsByCategory(profile: AgentSkillProfile): Record<string, SkillProgress[]> {
        const grouped: Record<string, SkillProgress[]> = {}

        for (const skill of Object.values(profile.skills)) {
            const category = this.getSkillCategory(skill.skillName)
            if (!grouped[category]) {
                grouped[category] = []
            }
            grouped[category].push(skill)
        }

        return grouped
    }

    /**
     * Get category for a skill
     * @param skillName Skill name
     * @returns Category name
     */
    private getSkillCategory(skillName: string): string {
        for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
            if ((skills as readonly string[]).includes(skillName)) {
                return category
            }
        }
        return 'other'
    }

    /**
     * Calculate average skill level for a group of skills
     * @param skills Array of skill progress
     * @returns Average skill level
     */
    private calculateAverageLevel(skills: SkillProgress[]): SkillLevel {
        if (skills.length === 0) return 'beginner'

        const totalLevel = skills.reduce((sum, skill) => sum + this.getLevelValue(skill.level), 0)
        const avgValue = totalLevel / skills.length

        if (avgValue >= 4.5) return 'master'
        if (avgValue >= 3.5) return 'expert'
        if (avgValue >= 2.5) return 'advanced'
        if (avgValue >= 1.5) return 'intermediate'
        return 'beginner'
    }

    /**
     * Get numeric value for skill level
     * @param level Skill level
     * @returns Numeric value (0-4)
     */
    private getLevelValue(level: SkillLevel): number {
        const levelValues: Record<SkillLevel, number> = {
            'beginner': 0,
            'intermediate': 1,
            'advanced': 2,
            'expert': 3,
            'master': 4
        }
        return levelValues[level]
    }

    /**
     * Get skill distribution for an agent
     * @param profile Agent skill profile
     * @returns Skill distribution by level
     */
    private getSkillDistribution(profile: AgentSkillProfile): Record<SkillLevel, number> {
        const distribution: Record<SkillLevel, number> = {
            beginner: 0,
            intermediate: 0,
            advanced: 0,
            expert: 0,
            master: 0
        }

        for (const skill of Object.values(profile.skills)) {
            distribution[skill.level]++
        }

        return distribution
    }
}

export const skillProgressionManager = new SkillProgressionManager()
