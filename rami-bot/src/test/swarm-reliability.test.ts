import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { truthEngine } from '../main/organization/truth-engine'
import { synergyManager } from '../main/organization/synergy-manager'
import { qaScorer } from '../main/quality/qa-scorer'
import { appEvents } from '../main/events'
import { memoryManager } from '../main/learning/memory-manager'

// Mock Electron app to avoid getPath errors
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('./mock_data'),
        on: vi.fn(),
    },
    ipcMain: { on: vi.fn(), handle: vi.fn() }
}))

// Mock LLMAgent - define inside factory to avoid hoisting issues
vi.mock('../main/llm/llm-agent', () => {
    return {
        LLMAgent: class MockLLMAgent {
            async processMessage(msg: string, id: string, type: string) { return 'Mocked Response' }
            async callLLM(prompt: string, task: string, provider: string) { return 'Mocked Response' }
        }
    }
})

// Mock memory dependencies
vi.mock('../main/learning/memory-manager', () => ({
    memoryManager: { recall: vi.fn().mockResolvedValue([]), save: vi.fn() }
}))
vi.mock('../main/learning/vector-store', () => ({
    vectorStore: { search: vi.fn().mockResolvedValue([]) }
}))

// Mock organization dependencies
vi.mock('../main/organization/audit-logger', () => ({
    auditLogger: { logAction: vi.fn().mockResolvedValue(undefined) }
}))
vi.mock('../main/organization/rollback-manager', () => ({
    rollbackManager: { initialize: vi.fn(), getHistory: vi.fn().mockReturnValue([]) }
}))
vi.mock('../main/organization/resource-optimizer', () => ({
    resourceOptimizer: { conductBidding: vi.fn().mockReturnValue([]), determineWinner: vi.fn(), negotiateProvider: vi.fn() }
}))

// Mock persistence to avoid filesystem errors
vi.mock('fs/promises', () => ({
    readFile: vi.fn().mockResolvedValue('[]'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined)
}))

// Mock events to avoid real broadcasts
vi.mock('../main/events', () => ({
    appEvents: {
        on: vi.fn(),
        emit: vi.fn(),
        removeAllListeners: vi.fn()
    }
}))

// Mock quality/test dependencies
vi.mock('../main/quality/test-generator', () => ({
    testGenerator: {
        generateFromFailure: vi.fn().mockResolvedValue({ id: 'reg_test_1' }),
        exportSingleTest: vi.fn().mockResolvedValue(undefined)
    }
}))

vi.mock('../main/quality/qa-scorer', () => ({
    qaScorer: {
        getRecentFailures: vi.fn().mockReturnValue([{ outputId: 'fail_task_1', feedback: 'Network error' }])
    }
}))

describe('Arabclaw Swarm Reliability Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        // Reset synergyManager state
        synergyManager['agents'] = new Map()
        synergyManager['tasks'] = new Map()
        synergyManager['projects'] = new Map()
        synergyManager['decisions'] = new Map()
        synergyManager['taskQueue'] = []
        synergyManager['claudeAgent'] = null

        // Initialize config for optimizeWorkforce
        synergyManager['config'] = {
            name: 'Test Organization',
            mission: 'Test mission',
            ceoId: 'ceo_rami',
            autoHire: false,
            maxAgents: 10,
            budgetPerAgent: 1000,
            maxConcurrentTasks: 5
        }

        // Initialize collaborationHistory mock
        synergyManager['collaborationHistory'] = {
            findBestHelper: vi.fn().mockReturnValue(null),
            recordCollaboration: vi.fn().mockResolvedValue(undefined),
            getPairMetrics: vi.fn().mockReturnValue({ totalCollaborations: 0, successRate: 0 }),
            initialize: vi.fn().mockResolvedValue(undefined)
        } as any
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    describe('Truth Protocol (TruthEngine)', () => {
        it('should assign high confidence to claims with reliable evidence', async () => {
            const claim = 'The sky is blue'
            const evidence = [
                {
                    source: 'https://nasa.gov/science',
                    type: 'web',
                    content: 'NASA verified the sky color is blue.',
                    reliability: 0.9,
                    timestamp: Date.now()
                }
            ] as any

            const verified = await truthEngine.verifyClaim(claim, evidence)
            expect(verified.confidence).toBeGreaterThanOrEqual(0.7) // Base 0.9 - assessment fallback if domain match fails
        })

        it('should classify as fact when multiple reliable sources agree', async () => {
            const claim = 'Water boils at 100 degrees Celsius'
            const evidence = [
                { source: 'https://science.edu/physics', type: 'web', content: 'Boiling point confirmed.', reliability: 0.85, timestamp: Date.now() },
                { source: 'https://lab.gov/chemistry', type: 'web', content: 'Standard boiling point is 100C.', reliability: 0.9, timestamp: Date.now() }
            ] as any

            const verified = await truthEngine.verifyClaim(claim, evidence)
            expect(verified.confidence).toBeGreaterThanOrEqual(0.9)
            expect(verified.classification).toBe('fact')
        })

        it('should detect contradictions and reduce confidence', async () => {
            const claim = 'The deal is confirmed'
            const evidence = [
                { source: 'email_1', type: 'document', content: 'The deal is confirmed.', reliability: 0.8, timestamp: Date.now() },
                { source: 'email_2', type: 'document', content: 'The deal is denied.', reliability: 0.8, timestamp: Date.now() }
            ] as any

            const verified = await truthEngine.verifyClaim(claim, evidence)
            // First verify contradictions exists
            expect(verified.contradictions).toBeDefined()
            expect(verified.contradictions!.length).toBeGreaterThan(0)
            expect(verified.confidence).toBeLessThan(0.7)
        })
    })

    describe('Coaching Protocol (SynergyManager)', () => {
        it('should detect underperforming agents and trigger coaching', async () => {
            const agent: any = {
                id: 'low_perf_agent',
                name: 'TraineeAgent',
                role: 'intern',
                status: 'idle',
                tasksCompleted: 4,
                successRate: 50,
                level: 'junior',
                systemPrompt: 'Follow instructions.',
                conversationHistory: []
            }
            synergyManager['agents'].set(agent.id, agent)

            const coachSpy = vi.spyOn(synergyManager as any, 'coachAgent').mockResolvedValue(undefined)

            agent.tasksCompleted = 5
            await (synergyManager as any).optimizeWorkforce()

            expect(coachSpy).toHaveBeenCalledWith(agent)
        })

        it('should update agent system prompt during coaching', async () => {
            const agent: any = {
                id: 'coach_me',
                name: 'CoachMe',
                level: 'junior',
                systemPrompt: 'Old Prompt'
            }
            const ceo = { id: 'ceo_rami', name: 'Rami', level: 'ceo' }
            synergyManager['agents'].set(agent.id, agent)
            synergyManager['agents'].set(ceo.id, ceo as any)

            const mockNewPrompt = 'Revised Prompt: You are now an ELITE agent with advanced verification protocols and autonomous problem solving capabilities. Focus on high quality output.'

            // Mock LLMAgent instance - directly set claudeAgent instead of using spy
            const mockClaude = {
                processMessage: vi.fn().mockResolvedValue(mockNewPrompt)
            }

            // Directly set the claudeAgent property to bypass dynamic import
            synergyManager['claudeAgent'] = mockClaude as any

            await (synergyManager as any).coachAgent(agent)

            expect(agent.systemPrompt).toBe(mockNewPrompt)
        })
    })

    describe('Project Closure Protocol (SynergyManager)', () => {
        it('should generate project summary when project is completed', async () => {
            const project: any = {
                id: 'proj_beta',
                name: 'Beta Project',
                objective: 'Complete the test suite',
                status: 'active',
                intelligence: ['Step 1 done', 'Step 2 done'],
                truthClaims: [{ claim: 'Code is stable' }],
                sharedState: {},
                createdAt: Date.now()
            }

            synergyManager['projects'].set(project.id, project)

            // Mock CEO and LLM
            const ceo = { id: 'ceo_rami', name: 'Rami', level: 'ceo' }
            synergyManager['agents'].set(ceo.id, ceo as any)

            const mockSummary = 'The project was successful. All tests passed.'
            // Directly set claudeAgent instead of using spy
            synergyManager['claudeAgent'] = {
                processMessage: vi.fn().mockResolvedValue(mockSummary)
            } as any

            // Trigger closure
            await (synergyManager as any).generateProjectSummary(project)

            expect(project.sharedState.finalSummary).toBe(mockSummary)
        })
    })

    describe('Multi-Agent Collaboration', () => {
        it('should successfully match agents by skills for collaboration', async () => {
            const agentA: any = { id: 'agent_a', name: 'Agent A', skills: ['coding'], status: 'idle' }
            const agentB: any = { id: 'agent_b', name: 'Agent B', skills: ['design'], status: 'idle' }

            synergyManager['agents'].set(agentA.id, agentA)
            synergyManager['agents'].set(agentB.id, agentB)

            // Mock securityAudit to succeed
            vi.spyOn(synergyManager as any, 'securityAudit').mockResolvedValue({ safe: true, issues: [], recommendations: [] })

            // Mock LLMAgent - directly set claudeAgent
            synergyManager['claudeAgent'] = {
                processMessage: vi.fn().mockResolvedValue('Collaboration result')
            } as any

            const result = await synergyManager.requestAgentCollaboration(
                'agent_a',
                ['design'],
                'Need help with UI design'
            )

            expect(result.success).toBe(true)
            expect(result.result).toBe('Collaboration result')
        })

        it('should fail if no agents match required skills', async () => {
            const agentA: any = { id: 'agent_a', name: 'Agent A', skills: ['coding'], status: 'idle' }
            synergyManager['agents'].set(agentA.id, agentA)

            const result = await synergyManager.requestAgentCollaboration(
                'agent_a',
                ['marketing'],
                'Need marketing help'
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain('No available agents')
        })
    })

    describe('Decision Protocol', () => {
        it('should create and track critical decisions', async () => {
            // Mock waitForCEOApproval to avoid 60s timeout
            vi.spyOn(synergyManager as any, 'waitForCEOApproval').mockResolvedValue(true)

            const decision = await synergyManager.requestDecision({
                type: 'hire',
                title: 'Hire Senior Engineer',
                description: 'We need more capacity',
                requesterId: 'ceo_rami',
                priority: 'critical'
            })

            expect(decision.id).toBeDefined()
            expect(decision.status).toBe('approved')
            expect(synergyManager['decisions'].get(decision.id)).toBeDefined()
        })
    })

    describe('Self-Correction Mechanism', () => {
        it('should trigger self-correction on task failure', async () => {
            const task: any = {
                id: 'fail_task_1',
                title: 'Failing Task',
                description: 'This will fail',
                status: 'in_progress',
                assigneeId: 'some_agent',
                priority: 'medium',
                result: { error: 'Network error' },
                expectedOutput: 'Success'
            }

            synergyManager['tasks'].set(task.id, task)

            // Mock the triggerSelfCorrection method directly
            const mockTriggerSelfCorrection = vi.fn().mockResolvedValue(undefined)
            const originalMethod = (synergyManager as any).triggerSelfCorrection
                ; (synergyManager as any).triggerSelfCorrection = mockTriggerSelfCorrection

            // Trigger completion with error
            await synergyManager.completeTask(task.id, { error: 'Network error' }, false)

            // Verify self-correction was triggered
            expect(mockTriggerSelfCorrection).toHaveBeenCalled()

                // Restore original method
                ; (synergyManager as any).triggerSelfCorrection = originalMethod
        })
    })
})
