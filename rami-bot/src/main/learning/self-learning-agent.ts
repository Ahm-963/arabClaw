import { memoryManager, Memory, TaskLearning } from './memory-manager'
import { appEvents } from '../events'

/**
 * Self-Learning Agent - Enables autonomous learning and improvement
 * 
 * This module wraps the agent's interactions to:
 * 1. Learn from every interaction
 * 2. Extract and remember facts
 * 3. Learn user preferences
 * 4. Improve task execution over time
 * 5. Self-reflect on successes and failures
 */

export interface InteractionRecord {
  id: string
  userMessage: string
  botResponse: string
  toolsUsed: string[]
  startTime: number
  endTime: number
  success: boolean
  error?: string
}

export interface LearningInsight {
  type: 'fact' | 'preference' | 'pattern' | 'skill' | 'correction'
  content: string
  confidence: number
}

class SelfLearningAgent {
  private currentInteraction: InteractionRecord | null = null
  private interactionHistory: InteractionRecord[] = []

  async initialize(): Promise<void> {
    await memoryManager.initialize()
    console.log('[SelfLearning] Initialized')
  }

  // Start tracking an interaction
  startInteraction(userMessage: string): string {
    const id = `int_${Date.now()}`
    this.currentInteraction = {
      id,
      userMessage,
      botResponse: '',
      toolsUsed: [],
      startTime: Date.now(),
      endTime: 0,
      success: false
    }
    return id
  }

  // Record tool usage
  recordToolUse(toolName: string): void {
    if (this.currentInteraction && !this.currentInteraction.toolsUsed.includes(toolName)) {
      this.currentInteraction.toolsUsed.push(toolName)
    }
  }

  // Complete interaction and trigger learning
  async completeInteraction(response: string, success: boolean, error?: string): Promise<void> {
    if (!this.currentInteraction) return

    this.currentInteraction.botResponse = response
    this.currentInteraction.endTime = Date.now()
    this.currentInteraction.success = success
    this.currentInteraction.error = error

    // Store in history
    this.interactionHistory.push(this.currentInteraction)
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100)
    }

    // Trigger learning
    await this.learnFromInteraction(this.currentInteraction)

    this.currentInteraction = null
  }

  // Main learning function
  private async learnFromInteraction(interaction: InteractionRecord): Promise<void> {
    try {
      // 1. Extract and remember facts
      await this.extractFacts(interaction)

      // 2. Learn preferences
      await this.extractPreferences(interaction)

      // 3. Learn patterns
      await this.extractPatterns(interaction)

      // 4. Learn task approaches
      await this.learnTaskApproach(interaction)

      // 5. Self-reflect
      await this.selfReflect(interaction)

      appEvents.emit('learning:complete', {
        interactionId: interaction.id,
        success: interaction.success
      })

    } catch (error: any) {
      console.error('[SelfLearning] Error:', error.message)
    }
  }

  // Extract facts from the interaction
  private async extractFacts(interaction: InteractionRecord): Promise<void> {
    const message = interaction.userMessage.toLowerCase()

    // Learn about user's name
    const nameMatch = message.match(/(?:my name is|i am|i'm|call me)\s+([a-z]+)/i)
    if (nameMatch) {
      await memoryManager.remember({
        type: 'fact',
        category: 'user_info',
        content: `User's name is ${nameMatch[1]}`,
        context: interaction.userMessage,
        confidence: 0.9,
        tags: ['name', 'user', 'personal']
      })
    }

    // Learn about user's location
    const locationMatch = message.match(/(?:i live in|i'm in|i am in|from)\s+([a-z\s]+?)(?:\.|,|$)/i)
    if (locationMatch) {
      await memoryManager.remember({
        type: 'fact',
        category: 'user_info',
        content: `User is in/from ${locationMatch[1].trim()}`,
        context: interaction.userMessage,
        confidence: 0.8,
        tags: ['location', 'user', 'personal']
      })
    }

    // Learn about user's work/job
    const jobMatch = message.match(/(?:i work as|i am a|i'm a|my job is)\s+([a-z\s]+?)(?:\.|,|$)/i)
    if (jobMatch) {
      await memoryManager.remember({
        type: 'fact',
        category: 'user_info',
        content: `User works as ${jobMatch[1].trim()}`,
        context: interaction.userMessage,
        confidence: 0.8,
        tags: ['job', 'work', 'user', 'personal']
      })
    }

    // Learn stated facts
    const factPatterns = [
      /(?:remember that|note that|keep in mind that)\s+(.+)/i,
      /(?:fyi|for your information)[,:]?\s*(.+)/i,
      /(?:important)[,:]?\s*(.+)/i
    ]

    for (const pattern of factPatterns) {
      const match = message.match(pattern)
      if (match) {
        await memoryManager.remember({
          type: 'fact',
          category: 'explicit',
          content: match[1].trim(),
          context: interaction.userMessage,
          confidence: 0.95,
          tags: ['explicit', 'user_stated'],
          source: 'user'
        })
      }
    }
  }

  // Extract user preferences
  private async extractPreferences(interaction: InteractionRecord): Promise<void> {
    const message = interaction.userMessage.toLowerCase()

    // Language preference
    if (message.includes('in arabic') || message.includes('بالعربي')) {
      await memoryManager.learnPreference('response_language', 'arabic', interaction.userMessage)
    } else if (message.includes('in hebrew') || message.includes('בעברית')) {
      await memoryManager.learnPreference('response_language', 'hebrew', interaction.userMessage)
    } else if (message.includes('in english')) {
      await memoryManager.learnPreference('response_language', 'english', interaction.userMessage)
    }

    // Format preferences
    if (message.includes('be brief') || message.includes('short answer')) {
      await memoryManager.learnPreference('response_length', 'brief', interaction.userMessage)
    } else if (message.includes('detailed') || message.includes('explain')) {
      await memoryManager.learnPreference('response_length', 'detailed', interaction.userMessage)
    }

    // Explicit preferences
    const prefPatterns = [
      /i (?:prefer|like|want)\s+(.+?)(?:\.|,|$)/i,
      /(?:always|usually)\s+(.+?)(?:\.|,|$)/i,
      /(?:don't|do not)\s+(.+?)(?:\.|,|$)/i
    ]

    for (const pattern of prefPatterns) {
      const match = message.match(pattern)
      if (match) {
        const pref = match[1].trim()
        const isNegative = message.includes("don't") || message.includes('do not')

        await memoryManager.learnPreference(
          `user_${isNegative ? 'dislikes' : 'likes'}_${pref.substring(0, 30)}`,
          { preference: pref, negative: isNegative },
          interaction.userMessage
        )
      }
    }
  }

  // Extract interaction patterns
  private async extractPatterns(interaction: InteractionRecord): Promise<void> {
    if (!interaction.success) return

    const message = interaction.userMessage.toLowerCase()

    // Learn successful command patterns
    const commandPatterns = [
      { regex: /^(open|launch|start)\s+/i, type: 'launch_app' },
      { regex: /^(search|find|look for)\s+/i, type: 'search' },
      { regex: /^(create|make|write)\s+/i, type: 'create' },
      { regex: /^(delete|remove)\s+/i, type: 'delete' },
      { regex: /^(set|change)\s+.*(volume|brightness)/i, type: 'system_control' },
      { regex: /^(remind|alert)\s+/i, type: 'reminder' },
      { regex: /^(what|how|why|when|where)/i, type: 'question' }
    ]

    for (const { regex, type } of commandPatterns) {
      if (regex.test(message)) {
        await memoryManager.learnPattern(
          type,
          `Tools used: ${interaction.toolsUsed.join(', ')}`,
          interaction.userMessage
        )
        break
      }
    }
  }

  // Learn successful task approaches
  private async learnTaskApproach(interaction: InteractionRecord): Promise<void> {
    if (!interaction.success || interaction.toolsUsed.length === 0) return

    const duration = interaction.endTime - interaction.startTime
    const message = interaction.userMessage.toLowerCase()

    // Determine task type
    let taskType = 'general'
    if (message.includes('screenshot')) taskType = 'screenshot'
    else if (message.includes('file') || message.includes('create') || message.includes('edit')) taskType = 'file_operation'
    else if (message.includes('search') || message.includes('find')) taskType = 'search'
    else if (message.includes('volume') || message.includes('brightness')) taskType = 'system_control'
    else if (message.includes('open') || message.includes('launch')) taskType = 'launch'
    else if (message.includes('remind') || message.includes('notification')) taskType = 'notification'
    else if (message.includes('weather')) taskType = 'weather'
    else if (message.includes('time') || message.includes('date')) taskType = 'datetime'

    await memoryManager.learnTask({
      taskType,
      description: interaction.userMessage,
      successfulApproach: `Used tools: ${interaction.toolsUsed.join(' -> ')}`,
      tools: interaction.toolsUsed,
      steps: interaction.toolsUsed,
      tips: interaction.success ? [`This approach completed in ${Math.round(duration / 1000)}s`] : [],
      avgDuration: duration
    })
  }

  // Self-reflection on interaction
  private async selfReflect(interaction: InteractionRecord): Promise<void> {
    const whatWorked: string[] = []
    const whatFailed: string[] = []
    let improvement = ''

    if (interaction.success) {
      whatWorked.push(`Successfully handled: ${interaction.userMessage.substring(0, 50)}...`)

      if (interaction.toolsUsed.length > 0) {
        whatWorked.push(`Effective tool sequence: ${interaction.toolsUsed.join(' -> ')}`)
      }

      const duration = interaction.endTime - interaction.startTime
      if (duration < 5000) {
        whatWorked.push('Fast response time')
      }
    } else {
      whatFailed.push(`Failed to handle: ${interaction.userMessage.substring(0, 50)}...`)

      if (interaction.error) {
        whatFailed.push(`Error: ${interaction.error}`)
        improvement = `Need to handle this error better: ${interaction.error}`
      }
    }

    await memoryManager.reflect(
      interaction.userMessage,
      interaction.success ? 'success' : 'failure',
      { whatWorked, whatFailed, improvement }
    )
  }

  // Get learning context for a query
  async getLearningContext(query: string): Promise<string> {
    return await memoryManager.buildLearningContext(query)
  }

  // Get learning statistics
  getStats() {
    return {
      ...memoryManager.getStats(),
      recentInteractions: this.interactionHistory.length,
      successRate: this.calculateSuccessRate()
    }
  }

  private calculateSuccessRate(): number {
    if (this.interactionHistory.length === 0) return 0
    const successes = this.interactionHistory.filter(i => i.success).length
    return Math.round((successes / this.interactionHistory.length) * 100)
  }

  // Explicit learning commands
  async teachFact(fact: string): Promise<Memory> {
    return await memoryManager.remember({
      type: 'fact',
      category: 'taught',
      content: fact,
      confidence: 1.0,
      tags: ['taught', 'explicit'],
      source: 'user'
    })
  }

  async teachPreference(key: string, value: any): Promise<void> {
    await memoryManager.learnPreference(key, value, 'Explicitly taught by user')
  }

  async forgetFact(query: string): Promise<boolean> {
    const memories = await memoryManager.recall(query, { limit: 1 })
    if (memories.length > 0) {
      return await memoryManager.forget(memories[0].id)
    }
    return false
  }

  // Recall memories
  async recall(query: string): Promise<Memory[]> {
    return await memoryManager.recall(query)
  }

  // Ingest document for learning
  async ingestDocument(filePath: string): Promise<{ success: boolean; learnedCount: number; error?: string }> {
    try {
      const { documentAnalysisService } = await import('../services/document-analysis')
      const path = await import('path')

      const text = await documentAnalysisService.extractText(filePath)

      if (!text || text.length === 0) {
        return { success: false, learnedCount: 0, error: 'No text extracted from document' }
      }

      // Store in memory
      await memoryManager.remember({
        type: 'learning',
        category: 'document',
        content: text, // Vector store will handle the embedding
        context: `Uploaded file: ${path.basename(filePath)}`,
        source: 'user',
        confidence: 1.0,
        tags: ['document', 'upload', path.extname(filePath).replace('.', '')]
      })

      return { success: true, learnedCount: 1 }
    } catch (error: any) {
      console.error('[SelfLearning] Ingest failed:', error)
      return { success: false, learnedCount: 0, error: error.message }
    }
  }
}

export const selfLearningAgent = new SelfLearningAgent()
