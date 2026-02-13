import { LLMAgent } from '../llm/llm-agent'
import { appEvents } from '../events'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface AgentConfig {
  id: string
  name: string
  personality: string
  systemPrompt: string
  skills: string[]
  color: string
  avatar: string
  isActive: boolean
  createdAt: number
  lastUsed: number
}

export interface AgentTask {
  id: string
  agentId: string
  task: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
  startedAt?: number
  completedAt?: number
}

export interface AgentCollaboration {
  id: string
  name: string
  agents: string[]
  task: string
  status: 'pending' | 'planning' | 'running' | 'completed' | 'failed'
  results: { agentId: string; result: string }[]
  createdAt: number
}

const DEFAULT_AGENTS: Partial<AgentConfig>[] = [
  {
    name: 'Rami',
    personality: 'Helpful, proactive, and friendly. Gets things done without asking unnecessary questions.',
    systemPrompt: 'You are Rami, the main AI assistant. You are helpful, proactive, and take action immediately.',
    skills: ['all'],
    color: '#6366f1',
    avatar: '🤖'
  },
  {
    name: 'Coder',
    personality: 'Expert programmer. Writes clean, efficient code. Explains technical concepts clearly.',
    systemPrompt: 'You are Coder, an expert programmer. Focus on writing clean, efficient, well-documented code.',
    skills: ['bash', 'str_replace_editor', 'web_search'],
    color: '#10b981',
    avatar: '👨‍💻'
  },
  {
    name: 'Researcher',
    personality: 'Thorough researcher. Finds accurate information and summarizes it clearly.',
    systemPrompt: 'You are Researcher, an expert at finding and summarizing information from the web.',
    skills: ['web_search', 'str_replace_editor', 'download_file'],
    color: '#f59e0b',
    avatar: '🔍'
  },
  {
    name: 'Assistant',
    personality: 'Organized personal assistant. Manages tasks, reminders, and daily activities.',
    systemPrompt: 'You are Assistant, a personal productivity helper. Help with reminders, scheduling, and organization.',
    skills: ['set_reminder', 'show_notification', 'speak', 'get_current_time', 'get_weather'],
    color: '#ec4899',
    avatar: '📋'
  },
  {
    name: 'System Admin',
    personality: 'Expert system administrator. Manages files, processes, and system settings.',
    systemPrompt: 'You are System Admin, expert at managing computer systems, files, and processes.',
    skills: ['bash', 'get_system_info', 'get_processes', 'kill_process', 'start_process', 'get_disk_space'],
    color: '#8b5cf6',
    avatar: '⚙️'
  }
]

export class AgentManager {
  private agents: Map<string, AgentConfig> = new Map()
  private agentInstances: Map<string, LLMAgent> = new Map()
  private runningTasks: Map<string, AgentTask> = new Map()
  private collaborations: Map<string, AgentCollaboration> = new Map()
  private configPath: string

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'agents.json')
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const configs: AgentConfig[] = JSON.parse(data)
      configs.forEach(config => this.agents.set(config.id, config))
      console.log(`[AgentManager] Loaded ${this.agents.size} agents`)
    } catch (error) {
      // Create default agents
      console.log('[AgentManager] Creating default agents')
      for (const defaultAgent of DEFAULT_AGENTS) {
        await this.createAgent(defaultAgent)
      }
    }
  }

  async saveAgents(): Promise<void> {
    const configs = Array.from(this.agents.values())
    await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2))
  }

  async createAgent(config: Partial<AgentConfig>): Promise<AgentConfig> {
    const agent: AgentConfig = {
      id: config.id || uuidv4(),
      name: config.name || 'New Agent',
      personality: config.personality || 'Helpful AI assistant',
      systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
      skills: config.skills || ['all'],
      color: config.color || '#6366f1',
      avatar: config.avatar || '🤖',
      isActive: config.isActive !== false,
      createdAt: config.createdAt || Date.now(),
      lastUsed: config.lastUsed || Date.now()
    }

    this.agents.set(agent.id, agent)
    await this.saveAgents()

    console.log(`[AgentManager] Created agent: ${agent.name}`)
    return agent
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const agent = this.agents.get(id)
    if (!agent) return null

    const updated = { ...agent, ...updates }
    this.agents.set(id, updated)
    await this.saveAgents()

    // Clear cached instance to apply new config
    this.agentInstances.delete(id)

    return updated
  }

  async deleteAgent(id: string): Promise<boolean> {
    if (!this.agents.has(id)) return false

    this.agents.delete(id)
    this.agentInstances.delete(id)
    await this.saveAgents()

    return true
  }

  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id)
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values())
  }

  getActiveAgents(): AgentConfig[] {
    return this.getAllAgents().filter(a => a.isActive)
  }

  private getAgentInstance(agentId: string): LLMAgent {
    if (!this.agentInstances.has(agentId)) {
      this.agentInstances.set(agentId, new LLMAgent())
    }
    return this.agentInstances.get(agentId)!
  }

  async runTask(agentId: string, task: string, chatId: string): Promise<AgentTask> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent not found: ${agentId}`)

    const taskObj: AgentTask = {
      id: uuidv4(),
      agentId,
      task,
      status: 'running',
      startedAt: Date.now()
    }

    this.runningTasks.set(taskObj.id, taskObj)
    appEvents.emitAgentActivity({ type: 'task_started', agentId, taskId: taskObj.id })

    try {
      // Update last used
      agent.lastUsed = Date.now()
      this.agents.set(agentId, agent)

      const instance = this.getAgentInstance(agentId)

      // Inject agent personality into the task
      const enhancedTask = `[Agent: ${agent.name}]\n[Personality: ${agent.personality}]\n\n${task}`

      const result = await instance.processMessage(enhancedTask, chatId, 'internal')

      taskObj.status = 'completed'
      taskObj.result = result
      taskObj.completedAt = Date.now()

    } catch (error: any) {
      taskObj.status = 'failed'
      taskObj.error = error.message
      taskObj.completedAt = Date.now()
    }

    this.runningTasks.set(taskObj.id, taskObj)
    appEvents.emitAgentActivity({ type: 'task_completed', agentId, taskId: taskObj.id })

    return taskObj
  }

  async runCollaboration(
    name: string,
    agentIds: string[],
    task: string,
    chatId: string
  ): Promise<AgentCollaboration> {
    const collab: AgentCollaboration = {
      id: uuidv4(),
      name,
      agents: agentIds,
      task,
      status: 'planning' as any, // Cast to any to allow new status types if interface isn't updated yet
      results: [],
      createdAt: Date.now()
    }

    this.collaborations.set(collab.id, collab)
    appEvents.emitAgentActivity({ type: 'collaboration_started', collabId: collab.id })

    try {
      // 1. PLANNING PHASE
      // Use the first agent or a default one as the supervisor
      const supervisorId = agentIds[0]
      const supervisor = this.getAgentInstance(supervisorId)
      const supervisorConfig = this.agents.get(supervisorId)

      if (!supervisor || !supervisorConfig) throw new Error('Supervisor agent not found')

      // Create context about available agents
      const agentContext = agentIds.map(id => {
        const a = this.agents.get(id)
        return a ? `- ${a.name} (${a.personality}, Skills: ${a.skills.join(', ')})` : ''
      }).join('\n')

      const planPrompt = `
You are the Project Manager for this collaboration.
TASK: "${task}"

AVAILABLE AGENTS:
${agentContext}

Create a detailed execution plan interacting with these agents.
Break the task into logical subtasks.
Assign each subtask to the MOST SUITABLE agent from the list.

Respond ONLY with valid JSON in this format:
{
  "subtasks": [
    {
      "title": "Short title",
      "description": "Detailed instruction for the agent",
      "assignedAgentId": "ID_OF_AGENT (must be one of: ${agentIds.join(', ')})"
    }
  ]
}
`
      // We need a way to get pure JSON from the agent.
      // For now, we'll ask for JSON and try to parse it.
      // In a real production system, we'd use forced function calling or JSON mode.
      const planResponse = await supervisor.processMessage(planPrompt, chatId, 'internal')

      // Attempt to extract JSON
      let plan: { subtasks: { title: string, description: string, assignedAgentId: string }[] }
      try {
        const jsonMatch = planResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found')
        }
      } catch (e) {
        // Fallback: simpler plan
        plan = {
          subtasks: agentIds.map(id => ({
            title: 'Contribute to task',
            description: `Please help with: ${task}`,
            assignedAgentId: id
          }))
        }
      }

      // Update collab object with plan (we'll need to update the interface later or just store it in results for now)
      // For now, let's proceed with execution
      collab.status = 'running'
      this.collaborations.set(collab.id, collab) // Persist status update

      // 2. EXECUTION PHASE - Run subtasks in PARALLEL for multitasking
      const results: { agentId: string, result: string }[] = []

      // Create parallel task promises
      const subtaskPromises = plan.subtasks.map(async (subtask) => {
        const agent = this.agents.get(subtask.assignedAgentId)
        if (!agent) {
          return { agentId: subtask.assignedAgentId, result: `[${subtask.title}] Agent not found` }
        }

        // Emit specific subtask event
        appEvents.emitAgentActivity({
          type: 'task_started',
          agentId: agent.id,
          details: `Subtask: ${subtask.title}`
        })

        try {
          const taskResult = await this.runTask(
            agent.id,
            `Context: Working on team task: "${task}".\n\nYour specific subtask:\n${subtask.title}\n${subtask.description}`,
            chatId
          )

          return {
            agentId: agent.id,
            result: `[${subtask.title}] ${taskResult.result || taskResult.error}`
          }

        } catch (e: any) {
          return {
            agentId: agent.id,
            result: `[${subtask.title}] Failed: ${e.message}`
          }
        }
      })

      // Execute all subtasks in parallel
      const parallelResults = await Promise.all(subtaskPromises)
      results.push(...parallelResults)

      collab.results = results
      collab.status = 'completed'

    } catch (error: any) {
      collab.status = 'failed'
      collab.results.push({ agentId: 'system', result: `Collaboration failed: ${error.message}` })
    }

    this.collaborations.set(collab.id, collab)
    appEvents.emitAgentActivity({ type: 'collaboration_completed', collabId: collab.id })

    return collab
  }

  getRunningTasks(): AgentTask[] {
    return Array.from(this.runningTasks.values()).filter(t => t.status === 'running')
  }

  getCollaborations(): AgentCollaboration[] {
    return Array.from(this.collaborations.values())
  }
}

export const agentManager = new AgentManager()
