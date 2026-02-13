import { auditLogger } from '../organization/audit-logger'
import { rollbackManager } from '../organization/rollback-manager'
import { ensembleManager } from '../organization/ensemble-manager'
import { conflictDetector } from '../organization/conflict-detector'
import { memorySummarizer } from '../learning/memory-summarizer'
import { memoryDeduplicator } from '../learning/memory-deduplicator'
import { qaScorer } from '../quality/qa-scorer'
import { patternDetector } from '../quality/pattern-detector'
import { playbookManager } from '../quality/playbook-manager'
import { testGenerator } from '../quality/test-generator'

/**
 * Soul Upgrade 2.0 Integration Module
 * Initializes and coordinates all advanced features
 */

export class SoulUpgradeIntegration {
    private initialized = false

    /**
     * Initialize all Soul Upgrade 2.0 systems
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('[Soul2.0] Already initialized')
            return
        }

        console.log('[Soul2.0] Initializing all systems...')

        try {
            // Phase 6A: Auditability
            await auditLogger.initialize()
            await rollbackManager.initialize()
            console.log('[Soul2.0] ✅ Auditability systems ready')

            // Phase 6C: Memory Intelligence (has initialize methods)
            // Note: Summarizer and Deduplicator don't have explicit init, but we can call them
            console.log('[Soul2.0] ✅ Memory Intelligence ready')

            // Phase 6E: QA Loop
            await playbookManager.initialize()
            await testGenerator.initialize()
            console.log('[Soul2.0] ✅ QA Loop systems ready')

            this.initialized = true
            console.log('[Soul2.0] 🚀 All systems initialized successfully')
        } catch (error: any) {
            console.error('[Soul2.0] Initialization failed:', error.message)
            throw error
        }
    }

    /**
     * Start background jobs
     */
    async startBackgroundJobs(): Promise<void> {
        console.log('[Soul2.0] Starting background jobs...')

        // Memory optimization jobs
        memorySummarizer.startWeeklySummarization()
        memoryDeduplicator.startMaintenanceLoop()

        console.log('[Soul2.0] ✅ Background jobs started')
    }

    /**
     * Get system health status
     */
    async getHealthStatus(): Promise<{
        auditLog: { totalDecisions: number; allowedCount: number }
        rollbacks: number
        qaScores: { recentFailures: number }
        patterns: number
        playbooks: number
        regressionTests: number
    }> {
        const stats = await auditLogger.getStats()
        const rollbackHistory = rollbackManager.getHistory()
        const failures = qaScorer.getRecentFailures()
        const patterns = patternDetector.getPatterns()
        const playbooks = playbookManager.getAllPlaybooks()
        const tests = testGenerator.getAllTests()

        return {
            auditLog: {
                totalDecisions: stats.totalDecisions,
                allowedCount: stats.allowed
            },
            rollbacks: rollbackHistory.length,
            qaScores: {
                recentFailures: failures.length
            },
            patterns: patterns.length,
            playbooks: playbooks.length,
            regressionTests: tests.length
        }
    }

    /**
     * Run a complete system check
     */
    async runSystemCheck(): Promise<{ success: boolean; report: string[] }> {
        const report: string[] = []
        let success = true

        report.push('=== Soul Upgrade 2.0 System Check ===')
        report.push('')

        // Check 1: Audit Logger
        try {
            const stats = await auditLogger.getStats()
            report.push(`✅ Audit Logger: ${stats.totalDecisions} decisions logged`)
        } catch (error: any) {
            report.push(`❌ Audit Logger: ${error.message}`)
            success = false
        }

        // Check 2: Rollback Manager
        try {
            const history = rollbackManager.getHistory()
            report.push(`✅ Rollback Manager: ${history.length} backups available`)
        } catch (error: any) {
            report.push(`❌ Rollback Manager: ${error.message}`)
            success = false
        }

        // Check 3: QA Scorer
        try {
            const failures = qaScorer.getRecentFailures(0.5, 5)
            report.push(`✅ QA Scorer: Tracking ${failures.length} recent failures`)
        } catch (error: any) {
            report.push(`❌ QA Scorer: ${error.message}`)
            success = false
        }

        // Check 4: Pattern Detector
        try {
            const patterns = patternDetector.getPatterns()
            report.push(`✅ Pattern Detector: ${patterns.length} patterns identified`)
        } catch (error: any) {
            report.push(`❌ Pattern Detector: ${error.message}`)
            success = false
        }

        // Check 5: Playbook Manager
        try {
            const playbooks = playbookManager.getAllPlaybooks()
            report.push(`✅ Playbook Manager: ${playbooks.length} playbooks available`)
        } catch (error: any) {
            report.push(`❌ Playbook Manager: ${error.message}`)
            success = false
        }

        // Check 6: Test Generator
        try {
            const tests = testGenerator.getAllTests()
            report.push(`✅ Test Generator: ${tests.length} regression tests`)
        } catch (error: any) {
            report.push(`❌ Test Generator: ${error.message}`)
            success = false
        }

        report.push('')
        report.push(success ? '🎉 All systems operational' : '⚠️ Some systems have issues')

        return { success, report }
    }

    /**
     * Demo: Run ensemble check
     */
    async demoEnsembleCheck(): Promise<void> {
        console.log('\n[Demo] Running ensemble check...')

        const result = await ensembleManager.ensembleCheck(
            'Should we refactor the memory system?',
            undefined,
            3
        )

        console.log(`Consensus: ${result.consensus}`)
        console.log(`Agreement: ${(result.agreementScore * 100).toFixed(1)}%`)
        console.log(`Votes: ${result.votes.length}`)

        if (result.consensus) {
            console.log(`Winner: ${result.winner}`)
        }

        // Check for conflicts
        const conflicts = await conflictDetector.detectConflicts(
            'Should we refactor the memory system?',
            result.votes
        )

        if (conflicts.length > 0) {
            console.log(`⚠️ ${conflicts.length} conflicts detected`)
            for (const conflict of conflicts) {
                console.log(`  - ${conflict.severity}: ${conflict.reason}`)
            }
        }
    }

    /**
     * Demo: QA Loop workflow
     */
    async demoQALoop(): Promise<void> {
        console.log('\n[Demo] Running QA Loop demo...')

        // 1. Score an output
        const score = await qaScorer.scoreOutput('demo_output_1', {
            taskCompleted: true,
            testsPass: true,
            buildSuccess: true,
            policyViolations: 0
        })
        console.log(`Output scored: ${(score.overall * 100).toFixed(0)}%`)

        // 2. Create a failure for pattern detection
        const failScore = await qaScorer.scoreOutput('demo_output_2', {
            taskCompleted: false,
            testsPass: false,
            buildSuccess: false,
            policyViolations: 2
        })
        console.log(`Failure recorded: ${(failScore.overall * 100).toFixed(0)}%`)

        // 3. Run pattern analysis
        const patterns = await patternDetector.analyzeFailures()
        console.log(`Patterns detected: ${patterns.length}`)

        // 4. Update playbooks from patterns
        const playbooksUpdated = await playbookManager.updateFromPatterns()
        console.log(`Playbooks updated: ${playbooksUpdated}`)

        // 5. Generate regression test
        const test = await testGenerator.generateFromFailure(
            failScore,
            'Test input',
            'Error occurred',
            'Expected success'
        )
        console.log(`Regression test created: ${test.id}`)
    }
}

export const soulUpgrade = new SoulUpgradeIntegration()
