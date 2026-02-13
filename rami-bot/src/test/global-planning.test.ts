
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as os from 'os'

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name: string) => path.join(os.tmpdir(), 'rami-bot-test', name))
    },
    appEvents: {
        on: vi.fn(),
        emit: vi.fn()
    }
}))

import { synergyManager } from '../main/organization/synergy-manager'
import { agentRegistry } from '../main/agents/registry'

describe('Global Planning & Orchestration', () => {

    beforeEach(async () => {
        await synergyManager.initialize()
    })

    it('should create a project from a high-level objective', async () => {
        const objective = 'Analyze competitor pricing and generate a report'

        // Mock Orchestrator
        const mockOrchestrator = {
            id: 'orchestrator-1',
            name: 'OrchestratorPrime',
            role: 'orchestrator',
            department: 'executive',
            process: vi.fn().mockResolvedValue(JSON.stringify({
                plan: "We will analyze pricing data and compile a report.",
                tasks: [
                    {
                        id: "task-1",
                        title: "Gather Pricing Data",
                        description: "Search for competitor pricing",
                        role: "researcher",
                        priority: "high",
                        dependencies: []
                    },
                    {
                        id: "task-2",
                        title: "Compile Report",
                        description: "Write report based on data",
                        role: "writer",
                        priority: "medium",
                        dependencies: ["task-1"]
                    }
                ]
            }))
        }

        // Inject mock orchestrator
        vi.spyOn(agentRegistry, 'getAgentsByRole').mockReturnValue([mockOrchestrator as any])
        vi.spyOn(synergyManager, 'createProjectFromPlan') // Spy on execution method

        const result = await synergyManager.createProject(objective)

        expect(mockOrchestrator.process).toHaveBeenCalledWith(objective)
        expect(result.projectId).toContain('proj_') // Should return a project ID
    })

    it('should preview a project plan without executing', async () => {
        const objective = 'Deploy new version'

        // Mock Orchestrator
        const mockOrchestrator = {
            id: 'orchestrator-1',
            process: vi.fn().mockResolvedValue(JSON.stringify({
                plan: "Deployment strategy",
                tasks: []
            }))
        }

        vi.spyOn(agentRegistry, 'getAgentsByRole').mockReturnValue([mockOrchestrator as any])

        const plan = await synergyManager.previewProject(objective)

        expect(plan).toBeDefined()
        expect(plan.plan).toBe("Deployment strategy")
    })
})
