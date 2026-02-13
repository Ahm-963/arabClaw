
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visionAnalyzer } from '../main/tools/vision-analyzer'
import { synergyManager } from '../main/organization/synergy-manager'
import { testGenerator } from '../main/quality/test-generator'
import { UIElement } from '../main/tools/types/vision-types'

describe('Level 5 Phase 3: Advanced Perception Verification', () => {

    describe('3.1 Semantic UI Analysis (Structural Graphs)', () => {
        it('should correctly group labels with their corresponding inputs', async () => {
            const elements: UIElement[] = [
                {
                    type: 'text',
                    label: 'Username',
                    boundingBox: { x: 100, y: 100, width: 80, height: 20 },
                    confidence: 1,
                    attributes: {},
                    isInteractive: false
                },
                {
                    type: 'input',
                    label: 'username_field',
                    boundingBox: { x: 100, y: 130, width: 200, height: 30 },
                    confidence: 1,
                    attributes: {},
                    isInteractive: true
                },
                {
                    type: 'text',
                    label: 'Password',
                    boundingBox: { x: 100, y: 180, width: 80, height: 20 },
                    confidence: 1,
                    attributes: {},
                    isInteractive: false
                },
                {
                    type: 'input',
                    label: 'password_field',
                    boundingBox: { x: 100, y: 210, width: 200, height: 30 },
                    confidence: 1,
                    attributes: {},
                    isInteractive: true
                }
            ]

            const graph = await visionAnalyzer.analyzeStructuralLayout(elements)

            expect(graph.groups).toHaveLength(2)
            expect(graph.groups[0].label).toBe('Username')
            expect(graph.groups[1].label).toBe('Password')
            expect(graph.relationships).toHaveLength(2)
            expect(graph.relationships[0].type).toBe('label-for')
        })
    })

    describe('3.2 Self-Correction Loop', () => {
        it('should trigger debugger task on failure', async () => {
            // Mock essential components
            vi.mock('../main/quality/test-generator', () => ({
                testGenerator: {
                    generateFromFailure: vi.fn().mockResolvedValue({ id: 'test_123' }),
                    exportSingleTest: vi.fn().mockResolvedValue(true)
                }
            }))

            vi.mock('../main/quality/qa-scorer', () => ({
                qaScorer: {
                    getRecentFailures: vi.fn().mockReturnValue([])
                }
            }))

            vi.mock('electron', () => ({
                app: {
                    getPath: vi.fn().mockReturnValue('/tmp/mock-user-data')
                },
                ipcMain: {
                    handle: vi.fn()
                }
            }))

            const createTaskSpy = vi.spyOn(synergyManager, 'createTask').mockResolvedValue({ id: 'debug_task' } as any)

            const mockupTask = {
                id: 'failed_task_1',
                title: 'Simple Task',
                description: 'This task will fail',
                assigneeId: 'agent_1',
                result: { error: 'Something went wrong' }
            }

            // Manually add task to map for completeTask to find it
            // @ts-ignore
            synergyManager.tasks.set(mockupTask.id, mockupTask)

            await synergyManager.completeTask(mockupTask.id, mockupTask.result, false)

            expect(testGenerator.generateFromFailure).toHaveBeenCalled()
            expect(testGenerator.generateFromFailure).toHaveBeenCalled()
            expect(createTaskSpy).toHaveBeenCalled()

            if (createTaskSpy.mock.calls.length > 0) {
                const callArgs = createTaskSpy.mock.calls[0][0]
                console.log('DEBUG: createTask called with:', JSON.stringify(callArgs))
                expect(callArgs.type).toBe('debugging')
            }
        })
    })
})
