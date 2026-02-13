import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { piiRedactor } from './pii-redactor'
import { vectorStore } from './vector-store'

/**
 * Memory Manager - Enables Rami Bot to learn and remember
 * 
 * Features:
 * - Long-term memory (persisted facts, preferences, learnings)
 * - Short-term memory (recent context)
 * - User preferences and patterns
 * - Task learning (successful approaches)
 * - Self-improvement through reflection
 * - RAG: Vector-based semantic search
 */

export interface Memory {
  id: string
  type: 'fact' | 'preference' | 'learning' | 'pattern' | 'correction' | 'skill'
  category: string
  content: string
  context?: string
  confidence: number // 0-1
  useCount: number
  successRate: number
  createdAt: number
  updatedAt: number
  lastUsedAt: number
  tags: string[]
  source: 'user' | 'self' | 'interaction'

  // Privacy & Provenance
  ttl?: number // Expiration timestamp
  sensitivity?: 'public' | 'private' | 'confidential'
  sourceId?: string // Origin conversation/document ID
  reliabilityScore?: number // 0-1, based on source
  hasPII?: boolean // Flagged if contains redacted PII
  metadata?: Record<string, any>
}

export interface UserPreference {
  id: string
  key: string
  value: any
  learnedFrom: string
  confidence: number
  updatedAt: number
}

export interface LearnedPattern {
  id: string
  trigger: string // What triggers this pattern
  response: string // How to respond
  examples: string[]
  successCount: number
  failCount: number
  lastUsed: number
}

export interface TaskLearning {
  id: string
  taskType: string
  description: string
  successfulApproach: string
  tools: string[]
  steps: string[]
  tips: string[]
  errorHandling: Record<string, string>
  successCount: number
  avgDuration: number
  createdAt: number
}

export interface Reflection {
  id: string
  interaction: string
  outcome: 'success' | 'failure' | 'partial'
  whatWorked: string[]
  whatFailed: string[]
  improvement: string
  createdAt: number
}

class MemoryManager {
  private memories: Map<string, Memory> = new Map()
  private preferences: Map<string, UserPreference> = new Map()
  private patterns: Map<string, LearnedPattern> = new Map()
  private taskLearnings: Map<string, TaskLearning> = new Map()
  private reflections: Reflection[] = []
  private dataPath: string
  private initialized = false

  constructor() {
    this.dataPath = path.join(app?.getPath('userData') || '.', 'learning')
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await fs.mkdir(this.dataPath, { recursive: true })

      // Load all learning data
      await this.loadMemories()
      await this.loadPreferences()
      await this.loadPatterns()
      await this.loadTaskLearnings()
      await this.loadReflections()

      // Initialize Vector Store
      await vectorStore.initialize()

      // Start TTL cleanup job (runs every hour)
      setInterval(() => this.cleanupExpiredMemories(), 60 * 60 * 1000)

      this.initialized = true
      console.log(`[MemoryManager] Initialized with ${this.memories.size} memories, ${this.preferences.size} preferences, ${this.patterns.size} patterns`)
    } catch (error: any) {
      console.error('[MemoryManager] Init error:', error.message)
    }
  }

  private cleanupExpiredMemories(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [id, mem] of this.memories.entries()) {
      if (mem.ttl && mem.ttl < now) {
        this.memories.delete(id)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned ${cleaned} expired memories`)
      this.saveMemories()
    }
  }

  // ============ HELPER METHODS ============

  async getAllMemories(): Promise<Memory[]> {
    return Array.from(this.memories.values())
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<boolean> {
    const existing = this.memories.get(id)
    if (!existing) return false

    const updated: Memory = { ...existing, ...updates, updatedAt: Date.now() }
    this.memories.set(id, updated)
    await this.saveMemories()
    return true
  }

  // ============ MEMORY OPERATIONS ============

  async remember(memory: Partial<Memory>): Promise<Memory> {
    // Ensure initialization
    if (!this.initialized) {
      console.warn('[MemoryManager] Not initialized, initializing now...')
      await this.initialize()
    }

    try {
      const id = memory.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // PII Redaction
      let redactionResult = { redacted: memory.content || '', hasPII: false }
      try {
        // Using top-level imported piiRedactor
        redactionResult = piiRedactor.redact(memory.content || '')
      } catch (err: any) {
        console.warn('[MemoryManager] PII Redaction warning:', err.message)
      }

      const fullMemory: Memory = {
        id,
        type: memory.type || 'fact',
        category: memory.category || 'general',
        content: redactionResult.redacted,
        context: memory.context,
        confidence: memory.confidence || 0.7,
        useCount: memory.useCount || 0,
        successRate: memory.successRate || 1,
        createdAt: memory.createdAt || Date.now(),
        updatedAt: Date.now(),
        lastUsedAt: Date.now(),
        tags: memory.tags || [],
        source: memory.source || 'interaction',
        ttl: memory.ttl,
        sensitivity: memory.sensitivity || 'public',
        sourceId: memory.sourceId,
        reliabilityScore: memory.reliabilityScore || 0.7,
        hasPII: redactionResult.hasPII
      }

      // Check for similar existing memory (text-based)
      const similar = this.findSimilarMemory(fullMemory.content)
      if (similar) {
        // Merge and strengthen
        similar.confidence = Math.min(1, similar.confidence + 0.1)
        similar.useCount++
        similar.updatedAt = Date.now()
        this.memories.set(similar.id, similar)
        await this.saveMemories()
        return similar
      }

      this.memories.set(id, fullMemory)

      // Save to file system
      try {
        await this.saveMemories()
      } catch (saveError: any) {
        // Rollback memory if save fails
        this.memories.delete(id)
        throw new Error(`Failed to persist memory: ${saveError.message}`)
      }

      // Add to Vector Store for semantic search (non-blocking)
      // This is optional - learning continues even if vectorization fails
      vectorStore.addDocument(fullMemory.content, {
        id: fullMemory.id,
        type: fullMemory.type,
        category: fullMemory.category
      }).catch(err => console.warn('[MemoryManager] Vectorization skipped (not critical):', err.message))

      console.log(`[MemoryManager] ✓ Remembered: ${fullMemory.content.substring(0, 50)}...`)
      return fullMemory
    } catch (error: any) {
      console.error('[MemoryManager] Critical Error in remember():', error)
      // Provide detailed error message
      const detailedError = error.message || 'Unknown error'
      throw new Error(`Learning failed: ${detailedError}. Check console for details.`)
    }
  }

  async recall(query: string, options?: { type?: string; category?: string; limit?: number }): Promise<Memory[]> {
    const results: Memory[] = []
    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(/\s+/)

    // 1. Keyword Search
    for (const memory of this.memories.values()) {
      // Filter by type/category if specified
      if (options?.type && memory.type !== options.type) continue
      if (options?.category && memory.category !== options.category) continue

      // Score relevance
      let score = 0
      const contentLower = memory.content.toLowerCase()

      // Exact match
      if (contentLower.includes(queryLower)) score += 10

      // Keyword matches
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) score += 2
        if (memory.tags.some(t => t.toLowerCase().includes(keyword))) score += 3
      }

      // Boost by confidence and success rate
      score *= memory.confidence * memory.successRate

      if (score > 0) {
        results.push({ ...memory, _score: score } as any)
      }
    }

    // 2. Semantic Search (RAG)
    try {
      const semanticResults = await vectorStore.search(query, options?.limit || 5)
      for (const doc of semanticResults) {
        const memory = this.memories.get(doc.metadata.id)
        if (memory) {
          // If already found by keyword, boost score
          const existing = results.find(r => r.id === memory.id)
          if (existing) {
            (existing as any)._score += 15 // High boost for semantic match
          } else {
            // Add new semantic match
            results.push({ ...memory, _score: 10 } as any)
          }
        }
      }
    } catch (e) {
      console.error('[MemoryManager] Semantic search failed:', e)
    }

    // Sort by score and limit
    results.sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0))

    const limited = results.slice(0, options?.limit || 10)

    // Update usage stats for recalled memories
    for (const mem of limited) {
      const original = this.memories.get(mem.id)
      if (original) {
        original.useCount++
        original.lastUsedAt = Date.now()
        this.memories.set(original.id, original)
      }
    }

    return limited
  }

  async forget(id: string): Promise<boolean> {
    const deleted = this.memories.delete(id)
    if (deleted) await this.saveMemories()
    return deleted
  }

  private findSimilarMemory(content: string): Memory | null {
    const contentLower = content.toLowerCase()

    for (const memory of this.memories.values()) {
      const memoryLower = memory.content.toLowerCase()

      // Simple similarity check (can be improved with embeddings)
      if (memoryLower === contentLower) return memory

      // Check for high word overlap
      const contentWords = new Set(contentLower.split(/\s+/))
      const memoryWords = new Set(memoryLower.split(/\s+/))
      const overlap = [...contentWords].filter(w => memoryWords.has(w)).length
      const similarity = overlap / Math.max(contentWords.size, memoryWords.size)

      if (similarity > 0.8) return memory
    }

    return null
  }

  // ============ PREFERENCE LEARNING ============

  async learnPreference(key: string, value: any, context: string): Promise<UserPreference> {
    const existing = this.preferences.get(key)

    if (existing) {
      // Strengthen confidence if same value
      if (JSON.stringify(existing.value) === JSON.stringify(value)) {
        existing.confidence = Math.min(1, existing.confidence + 0.15)
      } else {
        // New value - reduce confidence of old, store new if more recent
        existing.value = value
        existing.confidence = 0.6
      }
      existing.learnedFrom = context
      existing.updatedAt = Date.now()
      this.preferences.set(key, existing)
    } else {
      const pref: UserPreference = {
        id: `pref_${Date.now()}`,
        key,
        value,
        learnedFrom: context,
        confidence: 0.7,
        updatedAt: Date.now()
      }
      this.preferences.set(key, pref)
    }

    await this.savePreferences()
    return this.preferences.get(key)!
  }

  getPreference(key: string): any {
    const pref = this.preferences.get(key)
    return pref?.confidence && pref.confidence > 0.5 ? pref.value : null
  }

  getAllPreferences(): UserPreference[] {
    return Array.from(this.preferences.values())
  }

  // ============ PATTERN LEARNING ============

  async learnPattern(trigger: string, response: string, example: string): Promise<LearnedPattern> {
    const existingKey = this.findPatternKey(trigger)

    if (existingKey) {
      const pattern = this.patterns.get(existingKey)!
      if (!pattern.examples.includes(example)) {
        pattern.examples.push(example)
      }
      pattern.successCount++
      pattern.lastUsed = Date.now()
      this.patterns.set(existingKey, pattern)
    } else {
      const pattern: LearnedPattern = {
        id: `pat_${Date.now()}`,
        trigger,
        response,
        examples: [example],
        successCount: 1,
        failCount: 0,
        lastUsed: Date.now()
      }
      this.patterns.set(trigger.toLowerCase(), pattern)
    }

    await this.savePatterns()
    return this.patterns.get(trigger.toLowerCase()) || this.patterns.get(existingKey!)!
  }

  findPattern(input: string): LearnedPattern | null {
    const inputLower = input.toLowerCase()

    // Exact match
    if (this.patterns.has(inputLower)) {
      return this.patterns.get(inputLower)!
    }

    // Partial match
    for (const [key, pattern] of this.patterns.entries()) {
      if (inputLower.includes(key) || key.includes(inputLower)) {
        return pattern
      }
    }

    return null
  }

  private findPatternKey(trigger: string): string | null {
    const triggerLower = trigger.toLowerCase()

    for (const key of this.patterns.keys()) {
      if (key === triggerLower || key.includes(triggerLower) || triggerLower.includes(key)) {
        return key
      }
    }

    return null
  }

  async reportPatternOutcome(trigger: string, success: boolean): Promise<void> {
    const key = this.findPatternKey(trigger)
    if (key) {
      const pattern = this.patterns.get(key)!
      if (success) {
        pattern.successCount++
      } else {
        pattern.failCount++
      }
      pattern.lastUsed = Date.now()
      this.patterns.set(key, pattern)
      await this.savePatterns()
    }
  }

  // ============ TASK LEARNING ============

  async learnTask(learning: Partial<TaskLearning>): Promise<TaskLearning> {
    const id = learning.id || `task_${Date.now()}`
    const taskType = learning.taskType || 'unknown'

    const existing = this.taskLearnings.get(taskType)

    if (existing) {
      // Merge learnings
      if (learning.tips) {
        existing.tips = [...new Set([...existing.tips, ...learning.tips])]
      }
      if (learning.steps) {
        existing.steps = learning.steps // Use latest successful steps
      }
      if (learning.errorHandling) {
        existing.errorHandling = { ...existing.errorHandling, ...learning.errorHandling }
      }
      existing.successCount++
      this.taskLearnings.set(taskType, existing)
    } else {
      const task: TaskLearning = {
        id,
        taskType,
        description: learning.description || '',
        successfulApproach: learning.successfulApproach || '',
        tools: learning.tools || [],
        steps: learning.steps || [],
        tips: learning.tips || [],
        errorHandling: learning.errorHandling || {},
        successCount: 1,
        avgDuration: learning.avgDuration || 0,
        createdAt: Date.now()
      }
      this.taskLearnings.set(taskType, task)
    }

    await this.saveTaskLearnings()
    return this.taskLearnings.get(taskType)!
  }

  getTaskKnowledge(taskType: string): TaskLearning | null {
    return this.taskLearnings.get(taskType) || null
  }

  findRelevantTaskKnowledge(description: string): TaskLearning[] {
    const results: TaskLearning[] = []
    const descLower = description.toLowerCase()

    for (const task of this.taskLearnings.values()) {
      if (
        task.taskType.toLowerCase().includes(descLower) ||
        task.description.toLowerCase().includes(descLower) ||
        descLower.includes(task.taskType.toLowerCase())
      ) {
        results.push(task)
      }
    }

    return results
  }

  // ============ SELF-REFLECTION ============

  async reflect(interaction: string, outcome: 'success' | 'failure' | 'partial', analysis: {
    whatWorked?: string[]
    whatFailed?: string[]
    improvement?: string
  }): Promise<Reflection> {
    const reflection: Reflection = {
      id: `ref_${Date.now()}`,
      interaction,
      outcome,
      whatWorked: analysis.whatWorked || [],
      whatFailed: analysis.whatFailed || [],
      improvement: analysis.improvement || '',
      createdAt: Date.now()
    }

    this.reflections.push(reflection)

    // Keep only last 100 reflections
    if (this.reflections.length > 100) {
      this.reflections = this.reflections.slice(-100)
    }

    // Learn from reflection
    if (outcome === 'success' && analysis.whatWorked?.length) {
      for (const worked of analysis.whatWorked) {
        await this.remember({
          type: 'learning',
          category: 'success',
          content: worked,
          context: interaction,
          confidence: 0.8,
          source: 'self'
        })
      }
    }

    if (outcome === 'failure' && analysis.improvement) {
      await this.remember({
        type: 'correction',
        category: 'improvement',
        content: analysis.improvement,
        context: interaction,
        confidence: 0.9,
        source: 'self'
      })
    }

    await this.saveReflections()
    return reflection
  }

  getRecentReflections(limit: number = 10): Reflection[] {
    return this.reflections.slice(-limit)
  }

  // ============ CONTEXT BUILDING ============

  async buildLearningContext(query: string): Promise<string> {
    const memories = await this.recall(query, { limit: 5 })
    const taskKnowledge = this.findRelevantTaskKnowledge(query)
    const preferences = this.getAllPreferences().filter(p => p.confidence > 0.6)
    const recentReflections = this.getRecentReflections(3)

    let context = ''

    if (memories.length > 0) {
      context += '\n## Relevant Memories:\n'
      for (const mem of memories) {
        context += `- [${mem.type}] ${mem.content} (confidence: ${Math.round(mem.confidence * 100)}%)\n`
      }
    }

    if (taskKnowledge.length > 0) {
      context += '\n## Learned Task Approaches:\n'
      for (const task of taskKnowledge) {
        context += `- ${task.taskType}: ${task.successfulApproach}\n`
        if (task.tips.length > 0) {
          context += `  Tips: ${task.tips.join(', ')}\n`
        }
      }
    }

    if (preferences.length > 0) {
      context += '\n## User Preferences:\n'
      for (const pref of preferences.slice(0, 5)) {
        context += `- ${pref.key}: ${JSON.stringify(pref.value)}\n`
      }
    }

    if (recentReflections.length > 0) {
      context += '\n## Recent Learnings:\n'
      for (const ref of recentReflections) {
        if (ref.outcome === 'success' && ref.whatWorked.length > 0) {
          context += `- Success: ${ref.whatWorked[0]}\n`
        }
        if (ref.improvement) {
          context += `- Improvement: ${ref.improvement}\n`
        }
      }
    }

    return context
  }

  // ============ PERSISTENCE ============

  private async loadMemories(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'memories.json'), 'utf-8')
      const memories: Memory[] = JSON.parse(data)
      memories.forEach(m => this.memories.set(m.id, m))
    } catch (e) { }
  }

  private async saveMemories(): Promise<void> {
    const data = Array.from(this.memories.values())
    await fs.writeFile(path.join(this.dataPath, 'memories.json'), JSON.stringify(data, null, 2))
  }

  private async loadPreferences(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'preferences.json'), 'utf-8')
      const prefs: UserPreference[] = JSON.parse(data)
      prefs.forEach(p => this.preferences.set(p.key, p))
    } catch (e) { }
  }

  private async savePreferences(): Promise<void> {
    const data = Array.from(this.preferences.values())
    await fs.writeFile(path.join(this.dataPath, 'preferences.json'), JSON.stringify(data, null, 2))
  }

  private async loadPatterns(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'patterns.json'), 'utf-8')
      const patterns: LearnedPattern[] = JSON.parse(data)
      patterns.forEach(p => this.patterns.set(p.trigger.toLowerCase(), p))
    } catch (e) { }
  }

  private async savePatterns(): Promise<void> {
    const data = Array.from(this.patterns.values())
    await fs.writeFile(path.join(this.dataPath, 'patterns.json'), JSON.stringify(data, null, 2))
  }

  private async loadTaskLearnings(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'tasks.json'), 'utf-8')
      const tasks: TaskLearning[] = JSON.parse(data)
      tasks.forEach(t => this.taskLearnings.set(t.taskType, t))
    } catch (e) { }
  }

  private async saveTaskLearnings(): Promise<void> {
    const data = Array.from(this.taskLearnings.values())
    await fs.writeFile(path.join(this.dataPath, 'tasks.json'), JSON.stringify(data, null, 2))
  }

  private async loadReflections(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dataPath, 'reflections.json'), 'utf-8')
      this.reflections = JSON.parse(data)
    } catch (e) { }
  }

  private async saveReflections(): Promise<void> {
    await fs.writeFile(path.join(this.dataPath, 'reflections.json'), JSON.stringify(this.reflections, null, 2))
  }

  // ============ STATS ============

  getStats() {
    const memoryByType = this.getMemoryStats()
    return {
      totalMemories: this.memories.size,
      totalPreferences: this.preferences.size,
      totalPatterns: this.patterns.size,
      totalTaskLearnings: this.taskLearnings.size,
      totalReflections: this.reflections.length,
      memoryByType,
      topPatterns: this.getTopPatterns(5)
    }
  }

  async getLearningAnalytics() {
    const memories = Array.from(this.memories.values())
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    // Last 7 days ingestion
    const ingestionChart = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * dayMs
      const dayEnd = dayStart + dayMs
      return {
        date: new Date(dayStart).toLocaleDateString(),
        count: memories.filter(m => m.createdAt >= dayStart && m.createdAt < dayEnd).length
      }
    })

    const categories = Array.from(new Set(memories.map(m => m.category)))
    const distribution = categories.map(cat => ({
      name: cat,
      value: memories.filter(m => m.category === cat).length
    }))

    return {
      ingestionChart,
      distribution,
      totalMemories: memories.length,
      piiDetections: memories.filter(m => m.hasPII).length
    }
  }

  private getMemoryStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const mem of this.memories.values()) {
      stats[mem.type] = (stats[mem.type] || 0) + 1
    }
    return stats
  }

  private getTopPatterns(limit: number): LearnedPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, limit)
  }
}

export const memoryManager = new MemoryManager()
