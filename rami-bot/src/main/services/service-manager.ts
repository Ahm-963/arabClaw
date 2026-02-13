import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { appEvents } from '../events'

export interface ServiceConfig {
  name: string
  description: string
  type: 'longRunning' | 'scheduled'
  runtime: 'node' | 'python'
  entryFile: string
  schedule?: string
  userRequest: string
  expectation: string
}

export interface ServiceInfo {
  id: string
  name: string
  description: string
  type: 'longRunning' | 'scheduled'
  runtime: 'node' | 'python'
  entryFile: string
  schedule?: string
  status: 'running' | 'stopped' | 'error'
  createdAt: number
  servicePath: string
}

export class ServiceManager {
  private servicesDir: string
  private services: Map<string, ServiceInfo> = new Map()
  private processes: Map<string, ChildProcess> = new Map()

  constructor() {
    this.servicesDir = path.join(app.getPath('userData'), 'services')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.servicesDir, { recursive: true })
    await this.loadServices()
    console.log('[Services] Initialized with', this.services.size, 'services')
  }

  private async loadServices(): Promise<void> {
    try {
      const entries = await fs.readdir(this.servicesDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metaPath = path.join(this.servicesDir, entry.name, 'metadata.json')
          try {
            const content = await fs.readFile(metaPath, 'utf-8')
            const info: ServiceInfo = JSON.parse(content)
            info.status = 'stopped'
            this.services.set(info.id, info)
          } catch {
            // Skip invalid service directories
          }
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  async createService(config: ServiceConfig): Promise<ServiceInfo> {
    const id = `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const servicePath = path.join(this.servicesDir, id)

    await fs.mkdir(servicePath, { recursive: true })

    const info: ServiceInfo = {
      id,
      name: config.name,
      description: config.description,
      type: config.type,
      runtime: config.runtime,
      entryFile: config.entryFile,
      schedule: config.schedule,
      status: 'stopped',
      createdAt: Date.now(),
      servicePath
    }

    // Save metadata
    await fs.writeFile(
      path.join(servicePath, 'metadata.json'),
      JSON.stringify(info, null, 2),
      'utf-8'
    )

    this.services.set(id, info)
    appEvents.emitServiceStatusChanged(id, 'stopped')

    console.log('[Services] Created service:', id)
    return info
  }

  async startService(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId)
    if (!service) return false

    if (this.processes.has(serviceId)) {
      console.log('[Services] Service already running:', serviceId)
      return true
    }

    const entryPath = path.join(service.servicePath, service.entryFile)
    const runtime = service.runtime === 'node' ? 'node' : 'python'

    try {
      const proc = spawn(runtime, [entryPath], {
        cwd: service.servicePath,
        env: {
          ...process.env,
          RAMI_SERVICE_ID: serviceId,
          RAMI_API_URL: 'http://127.0.0.1:31415'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      })

      // Handle spawn errors (e.g., when runtime is not found in PATH)
      proc.on('error', (err) => {
        console.error(`[Services] Failed to start service ${serviceId}:`, err.message)
      })

      proc.stdout?.on('data', (data) => {
        console.log(`[Service ${serviceId}]`, data.toString())
      })

      proc.stderr?.on('data', (data) => {
        console.error(`[Service ${serviceId}]`, data.toString())
      })

      proc.on('exit', (code) => {
        console.log(`[Service ${serviceId}] Exited with code:`, code)
        this.processes.delete(serviceId)
        service.status = 'stopped'
        appEvents.emitServiceStatusChanged(serviceId, 'stopped')
      })

      this.processes.set(serviceId, proc)
      service.status = 'running'
      appEvents.emitServiceStatusChanged(serviceId, 'running')

      console.log('[Services] Started service:', serviceId)
      return true
    } catch (error: any) {
      console.error('[Services] Failed to start service:', error.message)
      service.status = 'error'
      appEvents.emitServiceStatusChanged(serviceId, 'error')
      return false
    }
  }

  async stopService(serviceId: string): Promise<boolean> {
    const proc = this.processes.get(serviceId)
    if (!proc) return true

    proc.kill('SIGTERM')
    this.processes.delete(serviceId)

    const service = this.services.get(serviceId)
    if (service) {
      service.status = 'stopped'
      appEvents.emitServiceStatusChanged(serviceId, 'stopped')
    }

    console.log('[Services] Stopped service:', serviceId)
    return true
  }

  async deleteService(serviceId: string): Promise<boolean> {
    await this.stopService(serviceId)

    const service = this.services.get(serviceId)
    if (!service) return false

    try {
      await fs.rm(service.servicePath, { recursive: true, force: true })
      this.services.delete(serviceId)
      console.log('[Services] Deleted service:', serviceId)
      return true
    } catch (error: any) {
      console.error('[Services] Failed to delete service:', error.message)
      return false
    }
  }

  listServices(): ServiceInfo[] {
    return Array.from(this.services.values())
  }

  async createDemoService(): Promise<ServiceInfo> {
    const scriptContent = `
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'service.log');

setInterval(() => {
  const msg = \`[Demo] Service heartbeat at \${new Date().toISOString()}\\n\`;
  fs.appendFileSync(logPath, msg);
  console.log(msg.trim());
}, 5000);

console.log('Demo Service Started');
`
    const id = `svc_demo_${Date.now()}`
    const servicePath = path.join(this.servicesDir, id)
    await fs.mkdir(servicePath, { recursive: true })

    await fs.writeFile(path.join(servicePath, 'index.js'), scriptContent, 'utf-8')

    const config: ServiceConfig = {
      name: 'Demo Heartbeat Service',
      description: 'Writes a log entry every 5 seconds to verify background execution.',
      type: 'longRunning',
      runtime: 'node',
      entryFile: 'index.js',
      userRequest: 'Create a demo service',
      expectation: 'Service runs and logs'
    }

    // Reuse create logic but with custom ID
    const info: ServiceInfo = {
      id,
      name: config.name,
      description: config.description,
      type: config.type,
      runtime: config.runtime,
      entryFile: config.entryFile,
      status: 'stopped',
      createdAt: Date.now(),
      servicePath
    }

    await fs.writeFile(
      path.join(servicePath, 'metadata.json'),
      JSON.stringify(info, null, 2),
      'utf-8'
    )

    this.services.set(id, info)
    return info
  }

  getServiceInfo(serviceId: string): ServiceInfo | undefined {
    return this.services.get(serviceId)
  }
}
