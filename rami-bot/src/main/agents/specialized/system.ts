/**
 * System Agent - MemuBot Capabilities
 * 
 * This agent provides MemuBot-style system automation capabilities:
 * - Background service management
 * - Scheduled task execution
 * - System monitoring and notifications
 * - File and process management
 * - Multi-platform messaging integration
 */

import { BaseAgent } from '../base-agent'
import { AgentRole } from '../types'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { EventEmitter } from 'events'

const execAsync = promisify(exec)

// MemuBot-style service interface
interface MemuService {
    id: string
    name: string
    description: string
    type: 'longRunning' | 'scheduled'
    runtime: 'node' | 'python'
    schedule?: string // cron expression for scheduled tasks
    status: 'running' | 'stopped' | 'error'
    lastRun?: Date
    nextRun?: Date
    expectation: string
    notifyPlatform?: 'telegram' | 'discord' | 'slack'
}

// Background task interface
interface BackgroundTask {
    id: string
    name: string
    callback: () => Promise<void>
    interval: number // ms
    timer?: ReturnType<typeof setInterval>
    running: boolean
}

export class SystemAgent extends BaseAgent {
    public static readonly AGENT_ID = 'system'
    public static readonly AGENT_NAME = 'System Agent (MemuBot)'
    
    private services: Map<string, MemuService> = new Map()
    private tasks: Map<string, BackgroundTask> = new Map()
    private eventBus: EventEmitter = new EventEmitter()
    private servicesDir: string
    private isInitialized: boolean = false

    constructor() {
        super(
            SystemAgent.AGENT_ID,
            SystemAgent.AGENT_NAME,
            'system' as AgentRole,
            ['system', 'automation', 'monitoring', 'services', 'scheduling', 'notifications']
        )
        
        // Default services directory
        this.servicesDir = path.join(process.env.APPDATA || '', 'rami-bot', 'services')
    }

    /**
     * Initialize the System Agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return

        // Ensure services directory exists
        if (!fs.existsSync(this.servicesDir)) {
            fs.mkdirSync(this.servicesDir, { recursive: true })
        }

        // Load existing services
        await this.loadServices()

        this.isInitialized = true
        console.log('[SystemAgent] MemuBot capabilities initialized')
    }

    /**
     * Main process method - implements BaseAgent interface
     */
    async process(message: string, context?: any): Promise<string> {
        await this.initialize()

        const taskLower = message.toLowerCase()
        const params = context || {}

        try {
            // Service management
            if (taskLower.includes('create service') || taskLower.includes('new service')) {
                const result = await this.handleCreateService(params)
                return result.output
            }
            
            if (taskLower.includes('start service')) {
                const result = await this.handleStartService(params)
                return result.output
            }
            
            if (taskLower.includes('stop service')) {
                const result = await this.handleStopService(params)
                return result.output
            }
            
            if (taskLower.includes('list service')) {
                const result = await this.handleListServices()
                return result.output
            }
            
            if (taskLower.includes('delete service')) {
                const result = await this.handleDeleteService(params)
                return result.output
            }

            // Background tasks
            if (taskLower.includes('schedule task') || taskLower.includes('create task')) {
                const result = await this.handleScheduleTask(params)
                return result.output
            }
            
            if (taskLower.includes('cancel task')) {
                const result = await this.handleCancelTask(params)
                return result.output
            }

            // System monitoring
            if (taskLower.includes('system info') || taskLower.includes('system status')) {
                const result = await this.getSystemInfo()
                return result.output
            }
            
            if (taskLower.includes('process') && taskLower.includes('list')) {
                const result = await this.listProcesses()
                return result.output
            }
            
            if (taskLower.includes('kill process') || taskLower.includes('terminate')) {
                const result = await this.killProcess(params)
                return result.output
            }

            // File operations
            if (taskLower.includes('watch file') || taskLower.includes('monitor file')) {
                const result = await this.handleWatchFile(params)
                return result.output
            }

            // Notifications
            if (taskLower.includes('notify') || taskLower.includes('send notification')) {
                const result = await this.handleNotification(params)
                return result.output
            }

            // Execute shell command
            if (taskLower.includes('execute') || taskLower.includes('run command')) {
                const result = await this.executeCommand(params)
                return result.output
            }

            // Use LLM for complex tasks
            const systemPrompt = `You are the System Agent with MemuBot capabilities.
You help with:
- Background service management (create, start, stop, list, delete services)
- Task scheduling (schedule recurring tasks, cancel tasks)
- System monitoring (system info, list processes, kill processes)
- File watching (monitor file changes)
- Notifications (send notifications to various platforms)
- Command execution (run shell commands)

Current services: ${JSON.stringify(Array.from(this.services.values()).map(s => ({ id: s.id, name: s.name, status: s.status })))}
Current tasks: ${this.tasks.size} running

Respond helpfully and suggest what actions you can take.`

            return await this.callLLM(systemPrompt, message, undefined, false)

        } catch (error: any) {
            return `System operation failed: ${error.message}`
        }
    }

    // ==================== SERVICE MANAGEMENT ====================

    /**
     * Create a new background service
     */
    private async handleCreateService(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { name, description, type, runtime, schedule, expectation, notifyPlatform, code } = params

        if (!name || !type || !runtime) {
            return {
                success: false,
                output: 'Missing required parameters: name, type, runtime'
            }
        }

        const serviceId = `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const serviceDir = path.join(this.servicesDir, serviceId)

        // Create service directory
        fs.mkdirSync(serviceDir, { recursive: true })

        // Create service metadata
        const service: MemuService = {
            id: serviceId,
            name,
            description: description || '',
            type: type as 'longRunning' | 'scheduled',
            runtime: runtime as 'node' | 'python',
            schedule,
            status: 'stopped',
            expectation: expectation || '',
            notifyPlatform
        }

        // Save metadata
        fs.writeFileSync(
            path.join(serviceDir, 'metadata.json'),
            JSON.stringify(service, null, 2)
        )

        // Create entry file if code provided
        if (code) {
            const entryFile = runtime === 'python' ? 'main.py' : 'index.js'
            fs.writeFileSync(path.join(serviceDir, entryFile), code)
        }

        this.services.set(serviceId, service)

        return {
            success: true,
            output: `Service "${name}" created successfully with ID: ${serviceId}`,
            metadata: { serviceId, servicePath: serviceDir, service }
        }
    }

    /**
     * Start a service
     */
    private async handleStartService(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { serviceId } = params
        const service = this.services.get(serviceId)

        if (!service) {
            return {
                success: false,
                output: `Service not found: ${serviceId}`
            }
        }

        const serviceDir = path.join(this.servicesDir, serviceId)
        const entryFile = service.runtime === 'python' ? 'main.py' : 'index.js'
        const entryPath = path.join(serviceDir, entryFile)

        if (!fs.existsSync(entryPath)) {
            return {
                success: false,
                output: `Entry file not found: ${entryPath}`
            }
        }

        try {
            // Start the service
            const command = service.runtime === 'python' 
                ? `python "${entryPath}"`
                : `node "${entryPath}"`

            // For long-running services, spawn detached
            if (service.type === 'longRunning') {
                const { spawn } = require('child_process')
                const child = spawn(command, [], {
                    detached: true,
                    stdio: 'ignore',
                    shell: true,
                    cwd: serviceDir,
                    env: {
                        ...process.env,
                        MEMU_SERVICE_ID: serviceId,
                        MEMU_API_URL: 'http://127.0.0.1:31415'
                    }
                })
                child.unref()
            } else {
                // Scheduled service - set up cron-like execution
                this.scheduleService(service)
            }

            service.status = 'running'
            service.lastRun = new Date()
            this.saveServiceMetadata(service)

            this.eventBus.emit('service:started', service)

            return {
                success: true,
                output: `Service "${service.name}" started`,
                metadata: { service }
            }

        } catch (error: any) {
            service.status = 'error'
            this.saveServiceMetadata(service)
            return {
                success: false,
                output: `Failed to start service: ${error.message}`
            }
        }
    }

    /**
     * Stop a service
     */
    private async handleStopService(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { serviceId } = params
        const service = this.services.get(serviceId)

        if (!service) {
            return {
                success: false,
                output: `Service not found: ${serviceId}`
            }
        }

        // Cancel scheduled task if any
        const task = this.tasks.get(serviceId)
        if (task && task.timer) {
            clearInterval(task.timer)
            task.running = false
        }

        service.status = 'stopped'
        this.saveServiceMetadata(service)
        this.eventBus.emit('service:stopped', service)

        return {
            success: true,
            output: `Service "${service.name}" stopped`,
            metadata: { service }
        }
    }

    /**
     * List all services
     */
    private async handleListServices(): Promise<{ success: boolean; output: string; metadata?: any }> {
        const serviceList = Array.from(this.services.values()).map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            status: s.status,
            lastRun: s.lastRun,
            nextRun: s.nextRun
        }))

        const output = serviceList.length === 0 
            ? 'No services found'
            : `Found ${serviceList.length} services:\n${serviceList.map(s => `  - ${s.name} (${s.id}): ${s.status}`).join('\n')}`

        return {
            success: true,
            output,
            metadata: { services: serviceList }
        }
    }

    /**
     * Delete a service
     */
    private async handleDeleteService(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { serviceId } = params
        const service = this.services.get(serviceId)

        if (!service) {
            return {
                success: false,
                output: `Service not found: ${serviceId}`
            }
        }

        // Stop if running
        if (service.status === 'running') {
            await this.handleStopService(params)
        }

        // Delete directory
        const serviceDir = path.join(this.servicesDir, serviceId)
        if (fs.existsSync(serviceDir)) {
            fs.rmSync(serviceDir, { recursive: true })
        }

        this.services.delete(serviceId)

        return {
            success: true,
            output: `Service "${service.name}" deleted`,
            metadata: { serviceId }
        }
    }

    // ==================== BACKGROUND TASKS ====================

    /**
     * Schedule a background task
     */
    private async handleScheduleTask(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { name, interval, action } = params

        if (!name || !interval) {
            return {
                success: false,
                output: 'Missing required parameters: name, interval'
            }
        }

        const taskId = `task_${Date.now()}`
        const intervalMs = this.parseInterval(interval)
        
        const task: BackgroundTask = {
            id: taskId,
            name,
            callback: async () => {
                console.log(`[SystemAgent] Running task: ${name}`)
                if (action) {
                    await execAsync(action)
                }
                this.eventBus.emit('task:executed', { taskId, name })
            },
            interval: intervalMs,
            running: true
        }

        // Start the task
        task.timer = setInterval(task.callback, task.interval)
        this.tasks.set(taskId, task)

        return {
            success: true,
            output: `Task "${name}" scheduled (every ${interval})`,
            metadata: { taskId, interval: task.interval }
        }
    }

    /**
     * Cancel a background task
     */
    private async handleCancelTask(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { taskId } = params
        const task = this.tasks.get(taskId)

        if (!task) {
            return {
                success: false,
                output: `Task not found: ${taskId}`
            }
        }

        if (task.timer) {
            clearInterval(task.timer)
        }
        task.running = false
        this.tasks.delete(taskId)

        return {
            success: true,
            output: `Task "${task.name}" cancelled`,
            metadata: { taskId }
        }
    }

    // ==================== SYSTEM MONITORING ====================

    /**
     * Get system information
     */
    private async getSystemInfo(): Promise<{ success: boolean; output: string; metadata?: any }> {
        const os = require('os')

        const info = {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
            loadAvg: os.loadavg(),
            nodeVersion: process.version,
            servicesRunning: Array.from(this.services.values()).filter(s => s.status === 'running').length,
            tasksRunning: Array.from(this.tasks.values()).filter(t => t.running).length
        }

        return {
            success: true,
            output: `System Info:
Platform: ${info.platform} (${info.arch})
Hostname: ${info.hostname}
CPUs: ${info.cpus}
Memory: ${info.freeMemory} free / ${info.totalMemory} total
Uptime: ${info.uptime}
Node: ${info.nodeVersion}
Services: ${info.servicesRunning} running
Tasks: ${info.tasksRunning} running`,
            metadata: info
        }
    }

    /**
     * List running processes
     */
    private async listProcesses(): Promise<{ success: boolean; output: string; metadata?: any }> {
        try {
            const { stdout } = await execAsync(
                process.platform === 'win32'
                    ? 'powershell -Command "Get-Process | Select-Object -First 20 ProcessName, Id, CPU, WorkingSet64 | Format-Table"'
                    : 'ps aux | head -20'
            )

            return {
                success: true,
                output: stdout,
                metadata: { platform: process.platform }
            }
        } catch (error: any) {
            return {
                success: false,
                output: `Failed to list processes: ${error.message}`
            }
        }
    }

    /**
     * Kill a process
     */
    private async killProcess(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { pid, name } = params

        if (!pid && !name) {
            return {
                success: false,
                output: 'Provide either pid or process name'
            }
        }

        try {
            const command = process.platform === 'win32'
                ? pid 
                    ? `taskkill /PID ${pid} /F`
                    : `taskkill /IM "${name}" /F`
                : pid
                    ? `kill -9 ${pid}`
                    : `pkill -9 "${name}"`

            const { stdout } = await execAsync(command)

            return {
                success: true,
                output: `Process terminated: ${pid || name}`,
                metadata: { stdout }
            }
        } catch (error: any) {
            return {
                success: false,
                output: `Failed to kill process: ${error.message}`
            }
        }
    }

    // ==================== FILE WATCHING ====================

    /**
     * Watch a file or directory for changes
     */
    private async handleWatchFile(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { path: filePath } = params

        if (!filePath) {
            return {
                success: false,
                output: 'File path required'
            }
        }

        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                output: `Path not found: ${filePath}`
            }
        }

        fs.watch(filePath, (eventType: string, filename: string | null) => {
            console.log(`[SystemAgent] File change detected: ${eventType} - ${filename}`)
            this.eventBus.emit('file:changed', { eventType, filename, path: filePath })
        })

        return {
            success: true,
            output: `Watching: ${filePath}`,
            metadata: { path: filePath }
        }
    }

    // ==================== NOTIFICATIONS ====================

    /**
     * Send a notification
     */
    private async handleNotification(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { platform, message, title } = params

        // This would integrate with notification systems
        // For now, emit an event that can be picked up by notification handlers
        this.eventBus.emit('notification', {
            platform: platform || 'system',
            title: title || 'RamiBot Notification',
            message
        })

        return {
            success: true,
            output: `Notification sent: ${message}`,
            metadata: { platform, title, message }
        }
    }

    // ==================== COMMAND EXECUTION ====================

    /**
     * Execute a shell command
     */
    private async executeCommand(params: any): Promise<{ success: boolean; output: string; metadata?: any }> {
        const { command, cwd, timeout } = params

        if (!command) {
            return {
                success: false,
                output: 'Command required'
            }
        }

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: cwd || process.cwd(),
                timeout: timeout || 30000
            })

            return {
                success: true,
                output: stdout || stderr || 'Command executed',
                metadata: { stdout, stderr }
            }
        } catch (error: any) {
            return {
                success: false,
                output: `Command failed: ${error.message}`
            }
        }
    }

    // ==================== HELPER METHODS ====================

    private async loadServices(): Promise<void> {
        if (!fs.existsSync(this.servicesDir)) return

        const dirs = fs.readdirSync(this.servicesDir, { withFileTypes: true })
            .filter(d => d.isDirectory())

        for (const dir of dirs) {
            const metadataPath = path.join(this.servicesDir, dir.name, 'metadata.json')
            if (fs.existsSync(metadataPath)) {
                try {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
                    this.services.set(metadata.id, metadata)
                } catch (e) {
                    console.error(`[SystemAgent] Failed to load service: ${dir.name}`)
                }
            }
        }
    }

    private saveServiceMetadata(service: MemuService): void {
        const metadataPath = path.join(this.servicesDir, service.id, 'metadata.json')
        fs.writeFileSync(metadataPath, JSON.stringify(service, null, 2))
    }

    private scheduleService(service: MemuService): void {
        if (!service.schedule) return

        const intervalMs = this.parseCronToMs(service.schedule)
        
        const task: BackgroundTask = {
            id: service.id,
            name: service.name,
            callback: async () => {
                // Execute the service
                const serviceDir = path.join(this.servicesDir, service.id)
                const entryFile = service.runtime === 'python' ? 'main.py' : 'index.js'
                const command = service.runtime === 'python' 
                    ? `python "${path.join(serviceDir, entryFile)}"`
                    : `node "${path.join(serviceDir, entryFile)}"`
                
                try {
                    await execAsync(command, {
                        cwd: serviceDir,
                        env: {
                            ...process.env,
                            MEMU_SERVICE_ID: service.id,
                            MEMU_API_URL: 'http://127.0.0.1:31415'
                        }
                    })
                    service.lastRun = new Date()
                    this.saveServiceMetadata(service)
                } catch (e) {
                    console.error(`[SystemAgent] Service execution failed: ${service.name}`)
                }
            },
            interval: intervalMs,
            running: true
        }

        task.timer = setInterval(task.callback, intervalMs)
        this.tasks.set(service.id, task)
    }

    private parseInterval(interval: string): number {
        const match = interval.match(/^(\d+)(s|m|h|d)?$/)
        if (!match) return 60000 // default 1 minute

        const value = parseInt(match[1])
        const unit = match[2] || 'm'

        switch (unit) {
            case 's': return value * 1000
            case 'm': return value * 60 * 1000
            case 'h': return value * 60 * 60 * 1000
            case 'd': return value * 24 * 60 * 60 * 1000
            default: return value * 60 * 1000
        }
    }

    private parseCronToMs(cron: string): number {
        // Simple cron parser - assumes format like "*/5" for every 5 minutes
        const match = cron.match(/^\*\/(\d+)$/)
        if (match) {
            return parseInt(match[1]) * 60 * 1000
        }
        return 60 * 60 * 1000 // default 1 hour
    }

    /**
     * Get event bus for external listeners
     */
    public getEventBus(): EventEmitter {
        return this.eventBus
    }
}

// Export singleton instance
export const systemAgent = new SystemAgent()

// Export for registration
export default SystemAgent
