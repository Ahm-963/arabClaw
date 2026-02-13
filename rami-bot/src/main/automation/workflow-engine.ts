/**
 * Workflow Automation Engine
 * Create, run, and combine AI agents with modular tools and extendable workflows
 * Proactive behavior with intent capture and long-term memory
 */

import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { appEvents } from '../events'
import { memoryManager } from '../learning/memory-manager'
import { synergyManager } from '../organization/synergy-manager'
import { toolExecutor } from '../tools/tool-executor'
import { isCronMatch } from '../utils/cron'

// ============ TYPES ============

export interface WorkflowStep {
  id: string
  name: string
  type: 'tool' | 'agent' | 'condition' | 'loop' | 'parallel' | 'wait' | 'input' | 'output'
  config: Record<string, any>
  nextOnSuccess?: string
  nextOnFailure?: string
  timeout?: number
}

export interface Workflow {
  id: string
  name: string
  description: string
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  variables: Record<string, any>
  enabled: boolean
  createdAt: number
  lastRunAt?: number
  runCount: number
  successCount: number
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'condition' | 'intent'
  config: Record<string, any>
}

export interface WorkflowRun {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: number
  completedAt?: number
  currentStep?: string
  results: Record<string, any>
  error?: string
}

export interface UserIntent {
  id: string
  pattern: string
  keywords: string[]
  workflow?: string
  action: string
  confidence: number
  learnedFrom: string[]
  lastTriggered?: number
  triggerCount: number
}

// ============ WORKFLOW ENGINE ============

class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map()
  private runs: Map<string, WorkflowRun> = new Map()
  private intents: Map<string, UserIntent> = new Map()
  private dataPath: string
  private isRunning: boolean = false
  private schedulerInterval: NodeJS.Timeout | null = null
  private proactiveInterval: NodeJS.Timeout | null = null

  constructor() {
    this.dataPath = path.join(app?.getPath('userData') || '.', 'workflows')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.dataPath, { recursive: true })
    await this.loadWorkflows()
    await this.loadIntents()
    await this.startScheduler()
    await this.startProactiveEngine()
    console.log(`[Workflow] Initialized with ${this.workflows.size} workflows, ${this.intents.size} intents`)
  }

  // ============ WORKFLOW MANAGEMENT ============

  async createWorkflow(config: Partial<Workflow>): Promise<Workflow> {
    const workflow: Workflow = {
      id: `wf_${uuidv4().substring(0, 8)}`,
      name: config.name || 'New Workflow',
      description: config.description || '',
      trigger: config.trigger || { type: 'manual', config: {} },
      steps: config.steps || [],
      variables: config.variables || {},
      enabled: config.enabled !== false,
      createdAt: Date.now(),
      runCount: 0,
      successCount: 0
    }

    this.workflows.set(workflow.id, workflow)
    await this.saveWorkflows()

    if (workflow.trigger.type === 'schedule') {
      this.scheduleWorkflow(workflow)
    }

    return workflow
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    const workflow = this.workflows.get(id)
    if (!workflow) return null

    Object.assign(workflow, updates)
    await this.saveWorkflows()

    // Reschedule if needed
    if (workflow.trigger.type === 'schedule') {
      this.unscheduleWorkflow(id)
      if (workflow.enabled) {
        this.scheduleWorkflow(workflow)
      }
    }

    return workflow
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    this.unscheduleWorkflow(id)
    const deleted = this.workflows.delete(id)
    if (deleted) {
      await this.saveWorkflows()
    }
    return deleted
  }

  // ============ WORKFLOW EXECUTION ============

  async runWorkflow(workflowId: string, input?: Record<string, any>): Promise<WorkflowRun> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    // Security audit before execution
    const audit = await synergyManager.securityAudit(
      JSON.stringify(workflow.steps),
      `Workflow: ${workflow.name}`
    )
    if (!audit.safe) {
      throw new Error(`Security check failed: ${audit.issues.join(', ')}`)
    }

    const run: WorkflowRun = {
      id: `run_${uuidv4().substring(0, 8)}`,
      workflowId,
      status: 'running',
      startedAt: Date.now(),
      results: { input: input || {} }
    }

    this.runs.set(run.id, run)

    try {
      // Execute steps
      let currentStepId: string | undefined = workflow.steps[0]?.id
      const variables = { ...workflow.variables, ...input }

      while (currentStepId && run.status === 'running') {
        const step = workflow.steps.find(s => s.id === currentStepId)
        if (!step) break

        run.currentStep = currentStepId

        try {
          const result = await this.executeStep(step, variables, run)
          run.results[step.id] = result
          variables[`step_${step.id}`] = result
          currentStepId = step.nextOnSuccess
        } catch (error: any) {
          run.results[step.id] = { error: error.message }
          if (step.nextOnFailure) {
            currentStepId = step.nextOnFailure
          } else {
            throw error
          }
        }
      }

      run.status = 'completed'
      workflow.successCount++
    } catch (error: any) {
      run.status = 'failed'
      run.error = error.message
    }

    run.completedAt = Date.now()
    workflow.runCount++
    workflow.lastRunAt = Date.now()

    await this.saveWorkflows()
    appEvents.emit('workflow:completed', run)

    return run
  }

  private async executeStep(step: WorkflowStep, variables: Record<string, any>, run: WorkflowRun): Promise<any> {
    const timeout = step.timeout || 60000

    return Promise.race([
      this.doExecuteStep(step, variables),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), timeout))
    ])
  }

  private async doExecuteStep(step: WorkflowStep, variables: Record<string, any>): Promise<any> {
    switch (step.type) {
      case 'tool':
        // Execute a tool
        return await this.executeTool(step.config.tool, this.interpolate(step.config.params, variables))

        // Delegate to an agent
        const task = await synergyManager.createTask({
          title: step.name,
          description: this.interpolate(step.config.prompt, variables),
          requiredSkills: step.config.skills || [],
          priority: step.config.priority || 'medium'
        })

        // Wait for completion via event listener
        return new Promise((resolve, reject) => {
          const handler = (data: { task: any, success: boolean }) => {
            if (data.task.id === task.id) {
              appEvents.removeListener('org:task_completed', handler)
              if (data.success) {
                resolve(data.task.result)
              } else {
                reject(new Error(`Agent task failed: ${data.task.result}`))
              }
            }
          }
          appEvents.on('org:task_completed', handler)

          // Add a safety timeout for the agent task itself (defaults to 5 mins)
          setTimeout(() => {
            appEvents.removeListener('org:task_completed', handler)
            reject(new Error(`Agent task ${task.id} timed out`))
          }, step.config.timeout || 300000)
        })

      case 'condition':
        // Evaluate condition safely
        const condition = this.interpolate(step.config.condition, variables)
        return this.safeEvaluate(condition, variables)

      case 'loop':
        // Loop over items
        const items = variables[step.config.items] || []
        const results = []
        for (const item of items) {
          results.push(await this.doExecuteStep(step.config.body, { ...variables, item }))
        }
        return results

      case 'parallel':
        // Execute steps in parallel
        const parallelSteps = step.config.steps || []
        return await Promise.all(parallelSteps.map((s: WorkflowStep) => this.doExecuteStep(s, variables)))

      case 'wait':
        // Wait for duration
        await new Promise(resolve => setTimeout(resolve, step.config.duration || 1000))
        return { waited: step.config.duration }

      case 'input':
        // Request user input
        appEvents.emit('workflow:input_required', { stepId: step.id, prompt: step.config.prompt })
        return variables[`input_${step.id}`]

      case 'output':
        // Output result
        return this.interpolate(step.config.template, variables)

      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  private async executeTool(toolName: string, params: Record<string, any>): Promise<any> {
    console.log(`[Workflow] Executing tool: ${toolName}`)
    return await toolExecutor.executeTool(toolName, params)
  }

  private interpolate(template: string, variables: Record<string, any>): any {
    if (typeof template !== 'string') return template
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
  }

  private safeEvaluate(expression: string, variables: Record<string, any>): boolean {
    // Safe expression evaluator - only allows simple comparisons
    const sanitized = expression.trim().toLowerCase()

    // Check for dangerous patterns
    if (/[;{}()=]/.test(sanitized) && !sanitized.includes('==') && !sanitized.includes('!=')) {
      return false
    }

    // Simple truthy check
    if (sanitized === 'true') return true
    if (sanitized === 'false') return false

    // Variable check
    if (variables[sanitized] !== undefined) {
      return !!variables[sanitized]
    }

    // Simple comparison: "value == something"
    const eqMatch = expression.match(/^(\w+)\s*==\s*(.+)$/)
    if (eqMatch) {
      const [, varName, expected] = eqMatch
      return String(variables[varName]) === expected.trim().replace(/['"]/g, '')
    }

    // Not equal: "value != something"
    const neqMatch = expression.match(/^(\w+)\s*!=\s*(.+)$/)
    if (neqMatch) {
      const [, varName, expected] = neqMatch
      return String(variables[varName]) !== expected.trim().replace(/['"]/g, '')
    }

    // Greater/less than
    const gtMatch = expression.match(/^(\w+)\s*>\s*(\d+)$/)
    if (gtMatch) {
      return Number(variables[gtMatch[1]]) > Number(gtMatch[2])
    }

    const ltMatch = expression.match(/^(\w+)\s*<\s*(\d+)$/)
    if (ltMatch) {
      return Number(variables[ltMatch[1]]) < Number(ltMatch[2])
    }

    return false
  }

  // ============ SCHEDULING ============

  private scheduleWorkflow(workflow: Workflow): void {
    // No-op now as the centralized scheduler handles it
    console.log(`[Workflow] Scheduled: ${workflow.name} (${workflow.trigger.type})`)
  }

  private unscheduleWorkflow(id: string): void {
    // No-op now
  }

  private async startScheduler(): Promise<void> {
    if (this.schedulerInterval) clearInterval(this.schedulerInterval)

    // Run every minute (on the minute)
    this.schedulerInterval = setInterval(() => this.checkSchedule(), 60000)

    // Also run a check immediately
    this.checkSchedule()
  }

  private async checkSchedule(): Promise<void> {
    const now = new Date()
    const nowMs = now.getTime()

    for (const workflow of this.workflows.values()) {
      if (!workflow.enabled || workflow.trigger.type !== 'schedule') continue

      const { cron, interval } = workflow.trigger.config
      let shouldRun = false

      if (cron) {
        shouldRun = isCronMatch(cron, now)
      } else if (interval) {
        const lastRun = workflow.lastRunAt || 0
        shouldRun = nowMs - lastRun >= interval
      }

      if (shouldRun) {
        console.log(`[Workflow] Scheduled trigger: ${workflow.name}`)
        this.runWorkflow(workflow.id).catch(err => {
          console.error(`[Workflow] Scheduled run failed (${workflow.name}):`, err.message)
        })
      }
    }
  }

  // ============ PROACTIVE BEHAVIOR & INTENT CAPTURE ============

  private async startProactiveEngine(): Promise<void> {
    // Check for proactive actions every minute
    this.proactiveInterval = setInterval(() => this.proactiveCheck(), 60000)
  }

  private async proactiveCheck(): Promise<void> {
    try {
      // Get recent memories and patterns
      const memories = await memoryManager.recall('', { limit: 20 })

      // Check for pending intents
      for (const intent of this.intents.values()) {
        if (intent.workflow && this.shouldTriggerIntent(intent)) {
          console.log(`[Workflow] Proactive trigger: ${intent.pattern}`)
          await this.runWorkflow(intent.workflow)
          intent.lastTriggered = Date.now()
          intent.triggerCount++
        }
      }

      // Look for patterns that might need action
      await this.analyzeForProactiveActions()

    } catch (error: any) {
      console.error('[Workflow] Proactive check error:', error.message)
    }
  }

  private shouldTriggerIntent(intent: UserIntent): boolean {
    if (!intent.workflow) return false
    if (intent.lastTriggered && Date.now() - intent.lastTriggered < 3600000) return false // Min 1 hour between triggers
    return intent.confidence > 0.8
  }

  private async analyzeForProactiveActions(): Promise<void> {
    // This is where the AI analyzes patterns and takes proactive action
    // Examples:
    // - User always checks email at 9am -> Prepare email summary
    // - User asks for weather before going out -> Send weather alert
    // - User works on project X on Mondays -> Prepare project updates
  }

  // ============ INTENT LEARNING ============

  async learnIntent(userMessage: string, action: string): Promise<UserIntent> {
    const keywords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3)

    // Check for similar existing intent
    for (const intent of this.intents.values()) {
      const overlap = keywords.filter(k => intent.keywords.includes(k)).length
      if (overlap > keywords.length * 0.7) {
        // Similar intent exists, strengthen it
        intent.confidence = Math.min(1, intent.confidence + 0.1)
        intent.learnedFrom.push(userMessage)
        intent.triggerCount++
        await this.saveIntents()
        return intent
      }
    }

    // Create new intent
    const intent: UserIntent = {
      id: `intent_${uuidv4().substring(0, 8)}`,
      pattern: userMessage,
      keywords,
      action,
      confidence: 0.6,
      learnedFrom: [userMessage],
      triggerCount: 1
    }

    this.intents.set(intent.id, intent)
    await this.saveIntents()
    return intent
  }

  async matchIntent(userMessage: string): Promise<UserIntent | null> {
    const keywords = userMessage.toLowerCase().split(/\s+/)
    let bestMatch: UserIntent | null = null
    let bestScore = 0

    for (const intent of this.intents.values()) {
      const overlap = keywords.filter(k => intent.keywords.includes(k)).length
      const score = (overlap / Math.max(keywords.length, intent.keywords.length)) * intent.confidence

      if (score > bestScore && score > 0.5) {
        bestScore = score
        bestMatch = intent
      }
    }

    return bestMatch
  }

  // ============ TEMPLATE WORKFLOWS ============

  getTemplates(): Workflow[] {
    return [
      {
        id: 'template_daily_summary',
        name: 'Daily Summary',
        description: 'Get a daily summary of emails, tasks, and calendar',
        trigger: { type: 'schedule', config: { interval: 86400000 } }, // Daily
        steps: [
          { id: 's1', name: 'Get Emails', type: 'tool', config: { tool: 'gmail_list', params: { q: 'is:unread' } } },
          { id: 's2', name: 'Get Tasks', type: 'tool', config: { tool: 'get_tasks', params: {} }, nextOnSuccess: 's3' },
          { id: 's3', name: 'Generate Summary', type: 'agent', config: { prompt: 'Summarize: {{step_s1}} {{step_s2}}' } }
        ],
        variables: {},
        enabled: false,
        createdAt: Date.now(),
        runCount: 0,
        successCount: 0
      },
      {
        id: 'template_file_backup',
        name: 'File Backup',
        description: 'Backup important files to cloud storage',
        trigger: { type: 'schedule', config: { interval: 604800000 } }, // Weekly
        steps: [
          { id: 's1', name: 'List Files', type: 'tool', config: { tool: 'list_files', params: { path: '{{source_path}}' } } },
          { id: 's2', name: 'Upload Files', type: 'loop', config: { items: 'step_s1', body: { type: 'tool', config: { tool: 'upload_file' } } } }
        ],
        variables: { source_path: 'C:\\Users\\Documents' },
        enabled: false,
        createdAt: Date.now(),
        runCount: 0,
        successCount: 0
      },
      {
        id: 'template_social_post',
        name: 'Social Media Post',
        description: 'Post content to multiple social platforms',
        trigger: { type: 'manual', config: {} },
        steps: [
          { id: 's1', name: 'Input Content', type: 'input', config: { prompt: 'Enter your post content' } },
          { id: 's2', name: 'Post to Twitter', type: 'tool', config: { tool: 'twitter_post', params: { text: '{{input_s1}}' } } },
          { id: 's3', name: 'Post to LinkedIn', type: 'tool', config: { tool: 'linkedin_post', params: { text: '{{input_s1}}' } } }
        ],
        variables: {},
        enabled: false,
        createdAt: Date.now(),
        runCount: 0,
        successCount: 0
      }
    ]
  }

  // ============ PERSISTENCE ============

  private async loadWorkflows(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'workflows.json'), 'utf-8')
      const workflows: Workflow[] = JSON.parse(data)
      workflows.forEach(w => this.workflows.set(w.id, w))
    } catch (e) { }
  }

  private async saveWorkflows(): Promise<void> {
    await fs.writeFile(
      path.join(this.dataPath, 'workflows.json'),
      JSON.stringify(Array.from(this.workflows.values()), null, 2)
    )
  }

  private async loadIntents(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'intents.json'), 'utf-8')
      const intents: UserIntent[] = JSON.parse(data)
      intents.forEach(i => this.intents.set(i.id, i))
    } catch (e) { }
  }

  private async saveIntents(): Promise<void> {
    await fs.writeFile(
      path.join(this.dataPath, 'intents.json'),
      JSON.stringify(Array.from(this.intents.values()), null, 2)
    )
  }

  // ============ API ============

  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id)
  }

  getRuns(workflowId?: string): WorkflowRun[] {
    const runs = Array.from(this.runs.values())
    return workflowId ? runs.filter(r => r.workflowId === workflowId) : runs
  }

  getIntents(): UserIntent[] {
    return Array.from(this.intents.values())
  }

  async stop(): Promise<void> {
    if (this.proactiveInterval) {
      clearInterval(this.proactiveInterval)
    }
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
    }
  }
}

export const workflowEngine = new WorkflowEngine()
