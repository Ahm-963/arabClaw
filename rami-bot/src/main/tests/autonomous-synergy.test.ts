import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SynergyManager } from '../organization/synergy-manager'
import { agentRegistry } from '../agents/registry'
import * as fs from 'fs/promises'

// Mock Electron
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((key) => `./tmp/${key}`)
    },
    shell: { openExternal: vi.fn() },
    BrowserWindow: {
        getAllWindows: vi.fn(() => []),
    },
    ipcMain: { on: vi.fn(), handle: vi.fn() },
    globalShortcut: { unregisterAll: vi.fn(), register: vi.fn() },
    clipboard: { readText: vi.fn() }
}))

describe('Synergy Manual Multi-Agent Test', () => {
    let synergy: SynergyManager

    beforeEach(async () => {
        synergy = new SynergyManager();
        // Manually setup enough state to run a test without the heavy initialize()
        (synergy as any).isRunning = true;
        (synergy as any).dataPath = './tmp/synergy';
        (synergy as any).config = {
            name: 'Test Org',
            mission: 'Testing',
            ceoId: 'ceo',
            autoHire: false,
            maxAgents: 10,
            budgetPerAgent: 100,
            maxConcurrentTasks: 5
        };
        await fs.mkdir('./tmp/synergy', { recursive: true });

        // Mock the orchestrator in registry
        agentRegistry.register({
            id: 'orch_1',
            name: 'Orchestrator',
            role: 'orchestrator',
            department: 'executive',
            process: async (input: string) => {
                return JSON.stringify({
                    projectName: "Manual Test Project",
                    tasks: [
                        { id: "t1", title: "Analyze", description: "Analyze requirements", requiredSkills: ["research"], priority: "high", dependencies: [] },
                        { id: "t2", title: "Build", description: "Build prototype", requiredSkills: ["coding"], priority: "medium", dependencies: ["t1"] }
                    ]
                })
            }
        } as any)
    })

    it('should execute the multi-agent chain manually', async () => {
        console.log('--- STARTING MANUAL SYNERGY TEST ---')

        // Mock previewProject to avoid LLM call
        vi.spyOn(synergy, 'previewProject').mockResolvedValue({
            projectName: "Manual Test Project",
            tasks: [
                { id: "t1", title: "Analyze", description: "Analyze requirements", type: "research", role: "researcher", requiredSkills: ["research"], priority: "high", dependencies: [] },
                { id: "t2", title: "Build", description: "Build prototype", type: "coding", role: "coder", requiredSkills: ["coding"], priority: "medium", dependencies: ["t1"] }
            ]
        })

        // 1. Setup Agents
        const researcher = await synergy.createAgent({ name: 'Researcher', role: 'researcher', skills: ['research'], department: 'research' }, 'system')
        const coder = await synergy.createAgent({ name: 'Coder', role: 'coder', skills: ['coding'], department: 'engineering' }, 'system')
        const security = await synergy.createAgent({ name: 'CyberGuard', role: 'security', skills: ['security'], department: 'security' }, 'system')
        console.log(`Agents ready: ${researcher.name}, ${coder.name}, ${security.name}`)

        // 2. Create Project
        const objective = "Simulated manual check."
        const projectId = await synergy.createProject(objective)
        console.log(`Project created: ${projectId}`)

        const dashboard = synergy.getDashboardSnapshot()
        expect(dashboard.tasks.length).toBe(2)

        // 3. Process Phase 1
        console.log('Running Phase 1 (Research)...')
        await (synergy as any).processTasks()
        let t1 = synergy.getDashboardSnapshot().tasks.find(t => t.title === 'Analyze')

        // In the real SynergyManager, processTasks calls executeTaskSafe, which calls executeTask.
        // For the test, we just want to see if it got assigned.
        expect(t1?.status).toBeDefined()
        console.log(`Task 1 status: ${t1?.status}, assigned to: ${t1?.assigneeId}`)

        expect(t1?.assigneeId).toBe(researcher.id)

        console.log('--- MANUAL SYNERGY TEST COMPLETE ---')
    })
})
