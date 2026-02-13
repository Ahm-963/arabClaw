/**
 * Skill Analytics
 * Provides analytics, insights, and reporting for skill progression
 */

import { skillProgressTracker } from './skill-progress-tracker'
import {
    AgentSkillProfile,
    SkillProgress,
    SkillLevel,
    SKILL_CATEGORIES,
    SkillCategory
} from './types/skill-types'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

/**
 * Skill trend data point
 */
export interface SkillTrendPoint {
    timestamp: number
    level: SkillLevel
    totalXP: number
    tasksCompleted: number
}

/**
 * Skill gap analysis result
 */
export interface SkillGapAnalysis {
    agentId: string
    agentName: string
    gaps: {
        category: string
        missingSkills: string[]
        weakSkills: { skillName: string; level: SkillLevel; reason: string }[]
    }[]
    recommendations: {
        skillName: string
        priority: 'high' | 'medium' | 'low'
        reason: string
        estimatedTasks: number // Tasks needed to reach next level
    }[]
}

/**
 * Skill progression chart data
 */
export interface SkillProgressionChart {
    agentId: string
    agentName: string
    skills: {
        skillName: string
        history: SkillTrendPoint[]
        currentLevel: SkillLevel
        projectedNextLevel?: {
            level: SkillLevel
            estimatedDate: number
            tasksNeeded: number
        }
    }[]
}

/**
 * Skill Analytics Class
 * Generates insights and reports for skill progression
 */
export class SkillAnalytics {
    private trendsPath: string
    private trends: Map<string, Map<string, SkillTrendPoint[]>> = new Map() // agentId -> skillName -> trends

    constructor() {
        this.trendsPath = path.join(app.getPath('userData'), 'learning', 'skill-trends.json')
    }

    /**
     * Initialize skill analytics
     */
    async initialize(): Promise<void> {
        try {
            await this.loadTrends()
            console.log('[SkillAnalytics] Initialized')
        } catch (error: any) {
            console.error('[SkillAnalytics] Initialization failed:', error.message)
        }
    }

    /**
     * Record skill progress snapshot for trend analysis
     * @param agentId Agent ID
     * @param skillName Skill name
     * @param progress Current skill progress
     */
    async recordSnapshot(agentId: string, skillName: string, progress: SkillProgress): Promise<void> {
        if (!this.trends.has(agentId)) {
            this.trends.set(agentId, new Map())
        }

        const agentTrends = this.trends.get(agentId)!
        if (!agentTrends.has(skillName)) {
            agentTrends.set(skillName, [])
        }

        const skillTrends = agentTrends.get(skillName)!
        skillTrends.push({
            timestamp: Date.now(),
            level: progress.level,
            totalXP: progress.totalXP,
            tasksCompleted: progress.tasksCompleted
        })

        // Keep only last 100 snapshots per skill
        if (skillTrends.length > 100) {
            skillTrends.shift()
        }

        await this.saveTrends()
    }

    /**
     * Perform skill gap analysis for an agent
     * @param agentId Agent ID
     * @returns Skill gap analysis
     */
    async analyzeSkillGaps(agentId: string): Promise<SkillGapAnalysis | null> {
        const profile = skillProgressTracker.getAgentProfile(agentId)
        if (!profile) return null

        const gaps: SkillGapAnalysis['gaps'] = []
        const recommendations: SkillGapAnalysis['recommendations'] = []

        // Analyze each skill category
        for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
            const agentSkillsInCategory = Object.values(profile.skills).filter(skill =>
                (categorySkills as readonly string[]).includes(skill.skillName)
            )

            // Find missing skills
            const missingSkills = categorySkills.filter(
                skill => !profile.skills[skill]
            )

            // Find weak skills (below intermediate)
            const weakSkills = agentSkillsInCategory
                .filter(skill => this.getLevelValue(skill.level) < 1) // Below intermediate
                .map(skill => ({
                    skillName: skill.skillName,
                    level: skill.level,
                    reason: `Only ${skill.level} level in ${category}`
                }))

            if (missingSkills.length > 0 || weakSkills.length > 0) {
                gaps.push({
                    category,
                    missingSkills,
                    weakSkills
                })
            }

            // Generate recommendations for weak skills
            for (const weak of weakSkills) {
                const skill = profile.skills[weak.skillName]
                const tasksNeeded = this.estimateTasksToNextLevel(skill)

                recommendations.push({
                    skillName: weak.skillName,
                    priority: 'high',
                    reason: `Improve ${category} proficiency`,
                    estimatedTasks: tasksNeeded
                })
            }
        }

        // Sort recommendations by priority
        recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 }
            return priorityOrder[a.priority] - priorityOrder[b.priority]
        })

        return {
            agentId: profile.agentId,
            agentName: profile.agentName,
            gaps,
            recommendations: recommendations.slice(0, 10) // Top 10
        }
    }

    /**
     * Generate skill progression chart data
     * @param agentId Agent ID
     * @returns Chart data with historical trends
     */
    async generateProgressionChart(agentId: string): Promise<SkillProgressionChart | null> {
        const profile = skillProgressTracker.getAgentProfile(agentId)
        if (!profile) return null

        const agentTrends = this.trends.get(agentId)
        const skills: SkillProgressionChart['skills'] = []

        for (const [skillName, progress] of Object.entries(profile.skills)) {
            const history = agentTrends?.get(skillName) || []

            // Calculate projection
            const projection = this.projectNextLevel(progress, history)

            skills.push({
                skillName,
                history,
                currentLevel: progress.level,
                projectedNextLevel: projection
            })
        }

        // Sort by total XP
        skills.sort((a, b) => {
            const aProgress = profile.skills[a.skillName]
            const bProgress = profile.skills[b.skillName]
            return bProgress.totalXP - aProgress.totalXP
        })

        return {
            agentId: profile.agentId,
            agentName: profile.agentName,
            skills
        }
    }

    /**
     * Export skill report to JSON
     * @param agentId Agent ID
     * @returns Path to exported report
     */
    async exportReport(agentId: string): Promise<string> {
        const profile = skillProgressTracker.getAgentProfile(agentId)
        if (!profile) throw new Error('Agent profile not found')

        const gapAnalysis = await this.analyzeSkillGaps(agentId)
        const chartData = await this.generateProgressionChart(agentId)

        const report = {
            generatedAt: Date.now(),
            agent: {
                id: profile.agentId,
                name: profile.agentName,
                totalXP: profile.totalXP,
                totalTasksCompleted: profile.totalTasksCompleted
            },
            skills: Object.values(profile.skills),
            gapAnalysis,
            chartData,
            globalStats: skillProgressTracker.getGlobalStats()
        }

        const reportsDir = path.join(app.getPath('userData'), 'reports')
        await fs.mkdir(reportsDir, { recursive: true })

        const filename = `skill-report-${agentId}-${Date.now()}.json`
        const filepath = path.join(reportsDir, filename)

        await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8')

        console.log(`[SkillAnalytics] Report exported: ${filepath}`)
        return filepath
    }

    /**
     * Get skill trends for a specific skill
     * @param agentId Agent ID
     * @param skillName Skill name
     * @returns Trend data points
     */
    getSkillTrends(agentId: string, skillName: string): SkillTrendPoint[] {
        return this.trends.get(agentId)?.get(skillName) || []
    }

    /**
     * Estimate tasks needed to reach next level
     * @param progress Current skill progress
     * @returns Estimated number of tasks
     */
    private estimateTasksToNextLevel(progress: SkillProgress): number {
        if (progress.level === 'master') return 0

        const xpNeeded = progress.xpToNextLevel
        const avgXPPerTask = progress.tasksCompleted > 0
            ? progress.totalXP / progress.tasksCompleted
            : 10 // Default estimate

        return Math.ceil(xpNeeded / avgXPPerTask)
    }

    /**
     * Project when skill will reach next level
     * @param progress Current skill progress
     * @param history Historical trend data
     * @returns Projection or undefined
     */
    private projectNextLevel(
        progress: SkillProgress,
        history: SkillTrendPoint[]
    ): SkillProgressionChart['skills'][0]['projectedNextLevel'] {
        if (progress.level === 'master' || history.length < 2) return undefined

        // Calculate XP gain rate from history
        const recentHistory = history.slice(-10) // Last 10 snapshots
        if (recentHistory.length < 2) return undefined

        const firstPoint = recentHistory[0]
        const lastPoint = recentHistory[recentHistory.length - 1]

        const timeDiff = lastPoint.timestamp - firstPoint.timestamp
        const xpDiff = lastPoint.totalXP - firstPoint.totalXP

        if (timeDiff === 0 || xpDiff === 0) return undefined

        const xpPerMs = xpDiff / timeDiff
        const msToNextLevel = progress.xpToNextLevel / xpPerMs

        const nextLevel = this.getNextLevel(progress.level)
        if (!nextLevel) return undefined

        return {
            level: nextLevel,
            estimatedDate: Date.now() + msToNextLevel,
            tasksNeeded: this.estimateTasksToNextLevel(progress)
        }
    }

    /**
     * Get next skill level
     * @param current Current level
     * @returns Next level or undefined
     */
    private getNextLevel(current: SkillLevel): SkillLevel | undefined {
        const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert', 'master']
        const currentIndex = levels.indexOf(current)
        return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : undefined
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
     * Load trends from disk
     */
    private async loadTrends(): Promise<void> {
        try {
            const data = await fs.readFile(this.trendsPath, 'utf-8')
            const parsed = JSON.parse(data)

            for (const [agentId, skills] of Object.entries(parsed)) {
                const agentTrends = new Map<string, SkillTrendPoint[]>()
                for (const [skillName, trends] of Object.entries(skills as any)) {
                    agentTrends.set(skillName, trends as SkillTrendPoint[])
                }
                this.trends.set(agentId, agentTrends)
            }

            console.log('[SkillAnalytics] Loaded trends')
        } catch (error) {
            console.log('[SkillAnalytics] No existing trends, starting fresh')
        }
    }

    /**
     * Save trends to disk
     */
    private async saveTrends(): Promise<void> {
        try {
            const data: any = {}

            for (const [agentId, skills] of this.trends.entries()) {
                data[agentId] = {}
                for (const [skillName, trends] of skills.entries()) {
                    data[agentId][skillName] = trends
                }
            }

            await fs.mkdir(path.dirname(this.trendsPath), { recursive: true })
            await fs.writeFile(this.trendsPath, JSON.stringify(data, null, 2), 'utf-8')
        } catch (error: any) {
            console.error('[SkillAnalytics] Failed to save trends:', error.message)
        }
    }
}

export const skillAnalytics = new SkillAnalytics()
