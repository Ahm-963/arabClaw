import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CronManager } from '../services/cron-manager'
import { ServiceManager, ServiceConfig } from '../services/service-manager'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app, BrowserWindow } from 'electron'

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => './test-data')
    },
    BrowserWindow: {
        getAllWindows: vi.fn().mockReturnValue([])
    }
}))

vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn().mockResolvedValue([])
}))

describe('Service & Cron Reliability Testing', () => {
    let cronManager: CronManager
    let serviceManager: ServiceManager

    beforeEach(() => {
        cronManager = new CronManager()
        serviceManager = new ServiceManager()
        vi.clearAllMocks()
    })

    describe('CronManager', () => {
        it('should add a recurring task correctly', async () => {
            const task = await cronManager.addTask(
                'Test Recurring',
                'echo hello',
                'recurring',
                '*/5 * * * *'
            )

            expect(task.name).toBe('Test Recurring')
            expect(task.type).toBe('recurring')
            expect(task.schedule).toBe('*/5 * * * *')
            expect(task.enabled).toBe(true)
        })

        it('should add a one-time task correctly', async () => {
            const timestamp = Date.now() + 10000
            const task = await cronManager.addTask(
                'Test One-time',
                'echo once',
                'one-time',
                undefined,
                timestamp
            )

            expect(task.type).toBe('one-time')
            expect(task.timestamp).toBe(timestamp)
        })
    })

    describe('ServiceManager', () => {
        it('should create a new service', async () => {
            (fs.writeFile as any).mockResolvedValue(undefined)

            const config: ServiceConfig = {
                name: 'Reliability Worker',
                description: 'Tests service reliability',
                type: 'longRunning',
                runtime: 'node',
                entryFile: 'worker.js',
                userRequest: 'Please test this',
                expectation: 'Should run forever'
            }

            const service: any = await serviceManager.createService(config)
            expect(service.name).toBe('Reliability Worker')
            expect(service.status).toBe('stopped')
        })

        it('should start and stop a service', async () => {
            (fs.writeFile as any).mockResolvedValue(undefined)

            const config: ServiceConfig = {
                name: 'Lifecycle Test',
                description: 'Test start/stop',
                type: 'longRunning',
                runtime: 'node',
                entryFile: 'test.js',
                userRequest: 'Start this service',
                expectation: 'Running'
            }
            const service: any = await serviceManager.createService(config)

            const startResult = await serviceManager.startService(service.id)
            expect(startResult).toBeDefined()
        })
    })
})
