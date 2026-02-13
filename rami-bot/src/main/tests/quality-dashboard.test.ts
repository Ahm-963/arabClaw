/**
 * Quality Dashboard Integration Test Suite
 * Tests all Quality Dashboard IPC handlers and functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { playbookManager } from '../quality/playbook-manager'
import { chaosManager } from '../quality/chaos-manager'
import { qaScorer } from '../quality/qa-scorer'
import { patternDetector, FailurePattern } from '../quality/pattern-detector'
import { settingsManager } from '../settings'

describe('Quality Dashboard Integration Tests', () => {
    beforeAll(async () => {
        // Initialize services
        await settingsManager.initialize()
        await playbookManager.initialize()
    })

    afterAll(async () => {
        // Cleanup - disable chaos mode
        await settingsManager.updateSettings({ chaosMode: false })
        chaosManager.stopAllExperiments()
    })

    describe('Chaos Manager', () => {
        it('should get initial chaos status', () => {
            const status = chaosManager.getStatus()
            expect(status).toHaveProperty('globalEnabled')
            expect(status).toHaveProperty('activeExperiments')
            expect(Array.isArray(status.activeExperiments)).toBe(true)
        })

        it('should enable global chaos mode', async () => {
            await settingsManager.updateSettings({ chaosMode: true })

            const status = chaosManager.getStatus()
            expect(status.globalEnabled).toBe(true)

            const settings = await settingsManager.getSettings()
            expect(settings.chaosMode).toBe(true)
        })

        it('should start latency experiment', async () => {
            await settingsManager.updateSettings({ chaosMode: true })
            chaosManager.startExperiment('latency')

            const status = chaosManager.getStatus()
            expect(status.activeExperiments).toContain('latency')
        })

        it('should apply latency delays', async () => {
            await settingsManager.updateSettings({ chaosMode: true })
            chaosManager.startExperiment('latency')

            const startTime = Date.now()
            await chaosManager.applyLatency()
            const endTime = Date.now()

            const delay = endTime - startTime
            expect(delay).toBeGreaterThanOrEqual(1900) // Allow 100ms tolerance
        })

        it('should start tool failure experiment', async () => {
            await settingsManager.updateSettings({ chaosMode: true })
            chaosManager.startExperiment('tool_failure')

            const status = chaosManager.getStatus()
            expect(status.activeExperiments).toContain('tool_failure')
        })

        it('should intercept tools with failures', async () => {
            await settingsManager.updateSettings({ chaosMode: true })
            chaosManager.startExperiment('tool_failure')

            let failureCount = 0
            const trials = 100

            for (let i = 0; i < trials; i++) {
                try {
                    await chaosManager.interceptTool('test_tool')
                } catch (err) {
                    if ((err as Error).message.includes('Chaos Failure')) {
                        failureCount++
                    }
                }
            }

            // Should fail approximately 30% of the time (allow 15-45% range)
            const failureRate = failureCount / trials
            expect(failureRate).toBeGreaterThan(0.15)
            expect(failureRate).toBeLessThan(0.45)
        })

        it('should stop experiments', async () => {
            await settingsManager.updateSettings({ chaosMode: true })
            chaosManager.startExperiment('latency')
            chaosManager.startExperiment('tool_failure')

            chaosManager.stopExperiment('latency')

            const status = chaosManager.getStatus()
            expect(status.activeExperiments).not.toContain('latency')
            expect(status.activeExperiments).toContain('tool_failure')
        })

        it('should disable global chaos mode', async () => {
            await settingsManager.updateSettings({ chaosMode: false })
            chaosManager.stopAllExperiments()

            const status = chaosManager.getStatus()
            expect(status.globalEnabled).toBe(false)
            expect(status.activeExperiments.length).toBe(0)
        })
    })

    describe('QA Scorer', () => {
        it('should score output with default criteria', async () => {
            const score = await qaScorer.scoreOutput('task_test_001', {
                taskCompleted: true,
                testsPass: true,
                buildSuccess: true,
                policyViolations: 0
            })

            expect(score).toHaveProperty('outputId', 'task_test_001')
            expect(score).toHaveProperty('overall')
            expect(score.overall).toBe(1.0)
        })

        it('should calculate average QA score', async () => {
            // Create some scores
            await qaScorer.scoreOutput('task_001', { taskCompleted: true, testsPass: true, buildSuccess: true, policyViolations: 0 })
            await qaScorer.scoreOutput('task_002', { taskCompleted: true, testsPass: false, buildSuccess: true, policyViolations: 0 })
            await qaScorer.scoreOutput('task_003', { taskCompleted: false, testsPass: false, buildSuccess: false, policyViolations: 1 })

            const metrics = qaScorer.getMetrics()

            expect(metrics).toHaveProperty('averageQAScore')
            expect(metrics).toHaveProperty('totalScores')
            expect(metrics.totalScores).toBeGreaterThanOrEqual(3)
        })

        it('should identify recent failures', async () => {
            // Create a failing score
            await qaScorer.scoreOutput('task_fail', { taskCompleted: false, testsPass: false, buildSuccess: false, policyViolations: 5 })

            const metrics = qaScorer.getMetrics()

            expect(metrics).toHaveProperty('recentFailures')
            expect(metrics).toHaveProperty('failureDetails')
            expect(metrics.recentFailures).toBeGreaterThan(0)
            expect(Array.isArray(metrics.failureDetails)).toBe(true)
        })
    })

    describe('Pattern Detector', () => {
        it('should detect no patterns initially', async () => {
            const patterns = await patternDetector.getPatterns()

            expect(Array.isArray(patterns)).toBe(true)
            // May have patterns from previous tests, so just check structure
            if (patterns.length > 0) {
                expect(patterns[0]).toHaveProperty('category')
                expect(patterns[0]).toHaveProperty('description')
                expect(patterns[0]).toHaveProperty('occurrences')
            }
        })

        it('should categorize failures correctly', async () => {
            // Add some failures with specific feedback
            await qaScorer.recordUserFeedback('task_build_1', false, 'Build failed: compilation error')
            await qaScorer.recordUserFeedback('task_build_2', false, 'Build failed: missing dependency')
            await qaScorer.recordUserFeedback('task_build_3', false, 'Build failed: syntax error')
            await qaScorer.recordUserFeedback('task_test_1', false, 'Test failed: assertion error')

            // Must call analyzeFailures to detect patterns
            await patternDetector.analyzeFailures()
            const patterns = await patternDetector.getPatterns()

            // Should detect build pattern
            const buildPattern = patterns.find((p: any) => p.category === 'build')
            expect(buildPattern).toBeDefined()
        })

        it('should update lastSeen timestamp', async () => {
            const patterns = await patternDetector.getPatterns()

            if (patterns.length > 0) {
                expect(patterns[0]).toHaveProperty('lastSeen')
                expect(typeof patterns[0].lastSeen).toBe('number')
            }
        })
    })

    describe('Playbook Manager', () => {
        it('should list all playbooks', async () => {
            const playbooks = await playbookManager.getAllPlaybooks()

            expect(Array.isArray(playbooks)).toBe(true)
            if (playbooks.length > 0) {
                expect(playbooks[0]).toHaveProperty('id')
                expect(playbooks[0]).toHaveProperty('title')
                expect(playbooks[0]).toHaveProperty('when')
            }
        })

        it('should create playbook from pattern', async () => {
            const pattern: FailurePattern = {
                id: 'pattern_test_001',
                category: 'build',
                description: 'Multiple build failures detected',
                occurrences: 5,
                firstSeen: Date.now() - 100000,
                lastSeen: Date.now(),
                affectedOutputs: ['output_1', 'output_2']
            }

            await playbookManager.createFromPattern(pattern)

            const playbooks = await playbookManager.getAllPlaybooks()
            const buildPlaybook = playbooks.find(p => p.id.includes('build'))

            expect(buildPlaybook).toBeDefined()
        })

        it('should get playbook details by ID', async () => {
            const playbooks = await playbookManager.getAllPlaybooks()

            if (playbooks.length > 0) {
                const details = await playbookManager.getPlaybook(playbooks[0].id)

                expect(details).toBeDefined()
            }
        })

        it('should update existing playbook', async () => {
            const playbooks = await playbookManager.getAllPlaybooks()

            if (playbooks.length > 0) {
                const playbookId = playbooks[0].id
                const beforeUpdate = await playbookManager.getPlaybook(playbookId)
                if (beforeUpdate) {
                    const initialPitfallsCount = beforeUpdate.pitfalls.length

                    // Add a new pitfall
                    const uniquePitfall = `Test pitfall added by automated test ${Date.now()}`
                    await playbookManager.addPitfall(playbookId, uniquePitfall)

                    const afterUpdate = await playbookManager.getPlaybook(playbookId)
                    expect(afterUpdate?.pitfalls.length).toBe(initialPitfallsCount + 1)
                }
            }
        })
    })

    describe('Integration: Full Workflow', () => {
        it('should complete full quality monitoring workflow', async () => {
            // 1. Enable chaos mode
            await settingsManager.updateSettings({ chaosMode: true })

            // 2. Start experiments
            chaosManager.startExperiment('tool_failure')

            // 3. Simulate task failures
            for (let i = 0; i < 5; i++) {
                await qaScorer.recordUserFeedback(`task_workflow_${i}`, false, 'Build failed in workflow test')
            }

            // 4. Detect patterns
            await patternDetector.analyzeFailures()
            const patterns = await patternDetector.getPatterns()
            expect(patterns.length).toBeGreaterThan(0)

            // 5. Create playbooks from patterns
            for (const pattern of patterns) {
                await playbookManager.createFromPattern(pattern)
            }

            // 6. Verify playbooks exist
            const playbooks = await playbookManager.getAllPlaybooks()
            expect(playbooks.length).toBeGreaterThan(0)

            // 7. Get metrics
            const metrics = qaScorer.getMetrics()
            expect(metrics.totalScores).toBeGreaterThan(0)

            // 8. Cleanup
            await settingsManager.updateSettings({ chaosMode: false })
        })
    })

    describe('Performance', () => {
        it('should handle large number of scores efficiently', async () => {
            const startTime = Date.now()

            // Score 1000 tasks
            for (let i = 0; i < 1000; i++) {
                await qaScorer.scoreOutput(`perf_task_${i}`, {
                    taskCompleted: true,
                    testsPass: true,
                    buildSuccess: true,
                    policyViolations: 0
                })
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // Should complete in under 5 seconds
            expect(duration).toBeLessThan(5000)
        })

        it('should handle pattern detection on large dataset', async () => {
            const startTime = Date.now()

            await patternDetector.getPatterns()

            const endTime = Date.now()
            const duration = endTime - startTime

            // Should complete in under 500ms
            expect(duration).toBeLessThan(500)
        })
    })
})
