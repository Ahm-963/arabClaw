/**
 * Skill Progress Tracker
 * Tracks skill usage, awards XP, handles level-ups, and persists progress
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import {
    SkillProgress,
    AgentSkillProfile,
    SkillXPAward,
    SkillLevel,
    XP_THRESHOLDS,
    XP_TO_NEXT_LEVEL,
    DEFAULT_DECAY_CONFIG,
    SkillDependency
} from './types/skill-types'
import { appEvents } from '../events'
import { achievementManager } from './achievement-manager'

/**
 * Skill Progress Tracker Class
 * Manages skill progression for all agents
 */
export class SkillProgressTracker {
    private profiles: Map<string, AgentSkillProfile> = new Map()
    private dataPath: string
    private initialized = false
    private decayInterval: any = null
    private dependencies: SkillDependency[] = []

    constructor() {
        this.dataPath = path.join(app.getPath('userData'), 'learning', 'skill-progress.json')
    }

    /**
     * Initialize the skill progress tracker
     */
    async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(this.dataPath), { recursive: true })

            // Load existing profiles
            await this.loadProfiles()

            // Start decay background task
            this.startDecayTask()

            // Initialize default dependencies (Skill Tree)
            this.setDependencies([
                { skillName: 'typescript', requiredSkillName: 'javascript', requiredLevel: 'intermediate' },
                { skillName: 'react', requiredSkillName: 'javascript', requiredLevel: 'intermediate' },
                { skillName: 'docker', requiredSkillName: 'linux', requiredLevel: 'intermediate' },
                { skillName: 'kubernetes', requiredSkillName: 'docker', requiredLevel: 'intermediate' }
            ])

            this.initialized = true
            console.log(`[SkillProgressTracker] Initialized with ${this.profiles.size} agent profiles`)
        } catch (error: any) {
            console.error('[SkillProgressTracker] Initialization failed:', error.message)
        }
    }

    /**
     * Set skill dependencies
     * @param dependencies Array of skill dependencies
     */
    setDependencies(dependencies: SkillDependency[]): void {
        this.dependencies = dependencies
    }

    /**
     * Start periodic skill decay task
     */
    private startDecayTask(): void {
        if (this.decayInterval) clearInterval(this.decayInterval)

        // Run once a day (check every hour)
        this.decayInterval = setInterval(() => {
            this.applyAllDecay()
        }, 1000 * 60 * 60)
    }

    /**
     * Apply decay to all skills for all agents
     */
    async applyAllDecay(): Promise<void> {
        let decayApplied = false
        for (const profile of this.profiles.values()) {
            const result = this.applyProfileDecay(profile)
            if (result) decayApplied = true
        }

        if (decayApplied) {
            await this.saveProfiles()
        }
    }

    /**
     * Apply decay to a single profile
     */
    private applyProfileDecay(profile: AgentSkillProfile): boolean {
        let changed = false
        const now = Date.now()
        const config = DEFAULT_DECAY_CONFIG

        if (!config.enabled) return false

        for (const skill of Object.values(profile.skills)) {
            const idleTime = now - skill.lastUsed
            const idleDays = idleTime / (1000 * 60 * 60 * 24)

            if (idleDays > config.idleDaysThreshold) {
                const daysToDecay = idleDays - config.idleDaysThreshold
                const xpLost = Math.floor(daysToDecay * config.decayRatePerDay)

                if (xpLost > 0) {
                    const minXP = XP_THRESHOLDS[config.minLevel]
                    const oldXP = skill.totalXP
                    skill.totalXP = Math.max(minXP, skill.totalXP - xpLost)

                    if (oldXP !== skill.totalXP) {
                        // Recalculate level and current XP
                        const oldLevel = skill.level
                        skill.level = this.calculateLevel(skill.totalXP)
                        skill.currentXP = skill.totalXP - XP_THRESHOLDS[skill.level]
                        skill.xpToNextLevel = XP_TO_NEXT_LEVEL[skill.level] - skill.currentXP

                        if (oldLevel !== skill.level) {
                            appEvents.emit('skill:decay-level-down', {
                                agentId: profile.agentId,
                                skillName: skill.skillName,
                                oldLevel,
                                newLevel: skill.level
                            })
                        }
                        changed = true
                    }
                }
            }
        }

        return changed
    }

    /**
     * Award XP to an agent for using a skill
     * @param agentId Agent ID
     * @param agentName Agent name
     * @param skillName Skill name
     * @param xpAmount XP to award
     * @param reason Reason for XP award
     * @returns XP award result with level-up info
     */
    async awardXP(
        agentId: string,
        agentName: string,
        skillName: string,
        xpAmount: number,
        reason: string
    ): Promise<SkillXPAward> {
        if (!this.initialized) await this.initialize()

        // Check dependencies
        if (!this.checkDependencies(agentId, skillName)) {
            return {
                agentId,
                skillName,
                xpAwarded: 0,
                reason: `Missing dependency for ${skillName}`,
                timestamp: Date.now(),
                previousLevel: 'beginner',
                newLevel: 'beginner',
                leveledUp: false
            }
        }

        // Get or create agent profile
        let profile = this.profiles.get(agentId)
        if (!profile) {
            profile = this.createAgentProfile(agentId, agentName)
            this.profiles.set(agentId, profile)
        }

        // Get or create skill progress
        let skillProgress = profile.skills[skillName]
        if (!skillProgress) {
            skillProgress = this.createSkillProgress(skillName)
            profile.skills[skillName] = skillProgress
        }

        // Store previous level
        const previousLevel = skillProgress.level

        // Award XP
        skillProgress.currentXP += xpAmount
        skillProgress.totalXP += xpAmount
        skillProgress.tasksCompleted++
        skillProgress.lastUsed = Date.now()

        // Update profile totals
        profile.totalXP += xpAmount
        profile.totalTasksCompleted++
        profile.updatedAt = Date.now()

        // Check for level-up
        const newLevel = this.calculateLevel(skillProgress.totalXP)
        const leveledUp = newLevel !== previousLevel

        if (leveledUp) {
            skillProgress.level = newLevel
            skillProgress.currentXP = skillProgress.totalXP - XP_THRESHOLDS[newLevel]
            skillProgress.xpToNextLevel = XP_TO_NEXT_LEVEL[newLevel]

            // Emit level-up event
            appEvents.emit('skill:level-up', {
                agentId,
                agentName,
                skillName,
                previousLevel,
                newLevel,
                totalXP: skillProgress.totalXP
            })

            console.log(`[SkillProgressTracker] 🎉 ${agentName} leveled up ${skillName}: ${previousLevel} → ${newLevel}`)
        } else {
            // Update XP to next level
            skillProgress.xpToNextLevel = XP_TO_NEXT_LEVEL[skillProgress.level] - skillProgress.currentXP
        }

        // Check for new achievements
        const nextAchievements = achievementManager.checkAchievements(profile)
        if (nextAchievements.length > 0) {
            profile.achievements.push(...nextAchievements)
            for (const ach of nextAchievements) {
                appEvents.emit('skill:achievement-unlocked', {
                    agentId,
                    agentName,
                    achievement: ach
                })
                console.log(`[SkillProgressTracker] 🏆 ${agentName} unlocked achievement: ${ach.name}`)
            }
        }

        // Save progress
        await this.saveProfiles()

        // Create award result
        const award: SkillXPAward = {
            agentId,
            skillName,
            xpAwarded: xpAmount,
            reason,
            timestamp: Date.now(),
            previousLevel,
            newLevel: skillProgress.level,
            leveledUp
        }

        // Emit XP award event
        appEvents.emit('skill:xp-awarded', award)

        return award
    }

    /**
     * Get agent's skill profile
     * @param agentId Agent ID
     * @returns Agent skill profile or undefined
     */
    getAgentProfile(agentId: string): AgentSkillProfile | undefined {
        return this.profiles.get(agentId)
    }

    /**
     * Get all agent profiles
     * @returns Array of all agent skill profiles
     */
    getAllProfiles(): AgentSkillProfile[] {
        return Array.from(this.profiles.values())
    }

    /**
     * Get skill progress for a specific agent and skill
     * @param agentId Agent ID
     * @param skillName Skill name
     * @returns Skill progress or undefined
     */
    getSkillProgress(agentId: string, skillName: string): SkillProgress | undefined {
        const profile = this.profiles.get(agentId)
        return profile?.skills[skillName]
    }

    /**
     * Get top skills for an agent
     * @param agentId Agent ID
     * @param limit Number of top skills to return
     * @returns Array of top skills sorted by total XP
     */
    getTopSkills(agentId: string, limit: number = 5): SkillProgress[] {
        const profile = this.profiles.get(agentId)
        if (!profile) return []

        return Object.values(profile.skills)
            .sort((a, b) => b.totalXP - a.totalXP)
            .slice(0, limit)
    }

    /**
     * Calculate skill level based on total XP
     * @param totalXP Total XP earned
     * @returns Skill level
     */
    private calculateLevel(totalXP: number): SkillLevel {
        if (totalXP >= XP_THRESHOLDS.master) return 'master'
        if (totalXP >= XP_THRESHOLDS.expert) return 'expert'
        if (totalXP >= XP_THRESHOLDS.advanced) return 'advanced'
        if (totalXP >= XP_THRESHOLDS.intermediate) return 'intermediate'
        return 'beginner'
    }

    /**
     * Create a new agent profile
     * @param agentId Agent ID
     * @param agentName Agent name
     * @returns New agent skill profile
     */
    private createAgentProfile(agentId: string, agentName: string): AgentSkillProfile {
        return {
            agentId,
            agentName,
            skills: {},
            achievements: [],
            totalXP: 0,
            totalTasksCompleted: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
    }

    /**
     * Check if dependencies are met for a skill
     */
    private checkDependencies(agentId: string, skillName: string): boolean {
        const profile = this.profiles.get(agentId)
        if (!profile) return true

        const relevantDeps = this.dependencies.filter(d => d.skillName === skillName)
        for (const dep of relevantDeps) {
            const reqSkill = profile.skills[dep.requiredSkillName]
            if (!reqSkill) return false

            const reqLevelVal = this.getLevelValue(dep.requiredLevel)
            const curLevelVal = this.getLevelValue(reqSkill.level)

            if (curLevelVal < reqLevelVal) return false
        }

        return true
    }

    /**
     * Get numeric value for skill level
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
     * Create a new skill progress entry
     * @param skillName Skill name
     * @returns New skill progress
     */
    private createSkillProgress(skillName: string): SkillProgress {
        return {
            skillName,
            level: 'beginner',
            currentXP: 0,
            totalXP: 0,
            xpToNextLevel: XP_TO_NEXT_LEVEL.beginner,
            tasksCompleted: 0,
            lastUsed: Date.now(),
            firstUsed: Date.now()
        }
    }

    /**
     * Load profiles from disk
     */
    private async loadProfiles(): Promise<void> {
        try {
            const data = await fs.readFile(this.dataPath, 'utf-8')
            const profiles: AgentSkillProfile[] = JSON.parse(data)

            profiles.forEach(profile => {
                // Migrating old profiles: ensure achievements array exists
                if (!profile.achievements) {
                    profile.achievements = []
                }
                this.profiles.set(profile.agentId, profile)
            })

            console.log(`[SkillProgressTracker] Loaded ${profiles.length} profiles`)
        } catch (error) {
            // File doesn't exist yet, start fresh
            console.log('[SkillProgressTracker] No existing profiles, starting fresh')
        }
    }

    /**
     * Save profiles to disk
     */
    private async saveProfiles(): Promise<void> {
        try {
            const profiles = Array.from(this.profiles.values())
            await fs.writeFile(this.dataPath, JSON.stringify(profiles, null, 2), 'utf-8')
        } catch (error: any) {
            console.error('[SkillProgressTracker] Failed to save profiles:', error.message)
        }
    }

    /**
     * Get statistics for all skills across all agents
     * @returns Skill statistics
     */
    getGlobalStats() {
        const stats = {
            totalAgents: this.profiles.size,
            totalSkills: 0,
            totalXP: 0,
            totalTasksCompleted: 0,
            skillDistribution: {} as Record<SkillLevel, number>,
            topSkills: [] as { skillName: string; totalXP: number; agents: number }[]
        }

        // Initialize skill distribution
        stats.skillDistribution = {
            beginner: 0,
            intermediate: 0,
            advanced: 0,
            expert: 0,
            master: 0
        }

        // Aggregate skill data
        const skillMap = new Map<string, { totalXP: number; agents: Set<string> }>()

        for (const profile of this.profiles.values()) {
            stats.totalXP += profile.totalXP
            stats.totalTasksCompleted += profile.totalTasksCompleted

            for (const [skillName, progress] of Object.entries(profile.skills)) {
                stats.totalSkills++
                stats.skillDistribution[progress.level as SkillLevel]++

                // Track skill across agents
                if (!skillMap.has(skillName)) {
                    skillMap.set(skillName, { totalXP: 0, agents: new Set() })
                }
                const skillData = skillMap.get(skillName)!
                skillData.totalXP += (progress as SkillProgress).totalXP
                skillData.agents.add(profile.agentId)
            }
        }

        // Get top skills
        stats.topSkills = Array.from(skillMap.entries())
            .map(([skillName, data]) => ({
                skillName,
                totalXP: data.totalXP,
                agents: data.agents.size
            }))
            .sort((a, b) => b.totalXP - a.totalXP)
            .slice(0, 10)

        return stats
    }
}

export const skillProgressTracker = new SkillProgressTracker()
