/**
 * Skills Platform - Extensible Capability System
 * Based on OpenClaw's skills platform (ClawHub)
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

// Skill metadata interface
export interface SkillMetadata {
  id: string
  name: string
  version: string
  description: string
  author?: string
  tags?: string[]
  capabilities?: string[]
}

// Skill definition interface
export interface Skill {
  metadata: SkillMetadata
  // Functions the skill provides
  functions?: Record<string, (...args: any[]) => Promise<any>>
  // Prompts the skill adds
  prompts?: string[]
  // Tools the skill registers
  tools?: string[]
  // Initialize callback
  initialize?: () => Promise<void>
  // Cleanup callback
  cleanup?: () => Promise<void>
}

// Skill registry entry
interface RegisteredSkill {
  skill: Skill
  enabled: boolean
  loadTime: number
}

// Skills configuration
export interface SkillsConfig {
  enabled: boolean
  skillsPath: string
  registryUrl?: string
}

const DEFAULT_SKILLS_CONFIG: SkillsConfig = {
  enabled: true,
  skillsPath: 'skills'
}

export class SkillsManager {
  private skills: Map<string, RegisteredSkill> = new Map()
  private config: SkillsConfig = DEFAULT_SKILLS_CONFIG
  private initialized = false
  private skillsPath: string = ''

  constructor() {
    // Initialize skills path
    this.skillsPath = path.join(app.getPath('userData'), 'skills')
  }

  /**
   * Initialize the skills platform
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Create skills directory if it doesn't exist
    try {
      await fs.mkdir(this.skillsPath, { recursive: true })
    } catch (error) {
      console.error('[Skills] Failed to create skills directory:', error)
    }

    this.initialized = true
    console.log('[Skills] Skills manager initialized')
  }

  /**
   * Load a skill from a directory
   */
  async loadSkill(skillPath: string): Promise<Skill | null> {
    try {
      const skillFilePath = path.join(skillPath, 'skill.json')
      const skillMdPath = path.join(skillPath, 'SKILL.md')

      // Try to load skill.json first, then SKILL.md
      let metadata: SkillMetadata | null = null

      try {
        const skillJson = await fs.readFile(skillFilePath, 'utf-8')
        metadata = JSON.parse(skillJson)
      } catch {
        try {
          const skillMd = await fs.readFile(skillMdPath, 'utf-8')
          // Parse SKILL.md frontmatter
          const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/)
          if (frontmatterMatch) {
            metadata = JSON.parse(frontmatterMatch[1])
          }
        } catch {
          console.error('[Skills] No skill.json or SKILL.md found in:', skillPath)
          return null
        }
      }

      if (!metadata) {
        return null
      }

      // Try to load skill module
      let skillFunctions: Record<string, (...args: any[]) => Promise<any>> = {}
      let skillPrompts: string[] = []
      let skillInitialize: (() => Promise<void>) | undefined
      let skillCleanup: (() => Promise<void>) | undefined

      try {
        const modulePath = path.join(skillPath, 'index.js')
        const module = await import(modulePath)

        if (module.functions) {
          skillFunctions = module.functions
        }
        if (module.prompts) {
          skillPrompts = module.prompts
        }
        if (module.initialize) {
          skillInitialize = module.initialize
        }
        if (module.cleanup) {
          skillCleanup = module.cleanup
        }
      } catch (error) {
        console.log('[Skills] No index.js module found for skill:', metadata.id)
      }

      const skill: Skill = {
        metadata: {
          id: metadata.id,
          name: metadata.name,
          version: metadata.version || '1.0.0',
          description: metadata.description || '',
          author: metadata.author,
          tags: metadata.tags || [],
          capabilities: metadata.capabilities || []
        },
        functions: skillFunctions,
        prompts: skillPrompts,
        initialize: skillInitialize,
        cleanup: skillCleanup
      }

      // Initialize the skill if it has an init function
      if (skill.initialize) {
        try {
          await skill.initialize()
        } catch (error) {
          console.error(`[Skills] Failed to initialize skill ${metadata.id}:`, error)
        }
      }

      return skill
    } catch (error) {
      console.error('[Skills] Failed to load skill from:', skillPath, error)
      return null
    }
  }

  /**
   * Load all skills from the skills directory
   */
  async loadAllSkills(): Promise<void> {
    await this.initialize()

    try {
      const entries = await fs.readdir(this.skillsPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(this.skillsPath, entry.name)
          const skill = await this.loadSkill(skillPath)

          if (skill) {
            this.skills.set(skill.metadata.id, {
              skill,
              enabled: true,
              loadTime: Date.now()
            })
            console.log(`[Skills] Loaded skill: ${skill.metadata.name} v${skill.metadata.version}`)
          }
        }
      }
    } catch (error) {
      console.error('[Skills] Failed to load skills:', error)
    }
  }

  /**
   * Register a skill programmatically
   */
  registerSkill(skill: Skill): void {
    this.skills.set(skill.metadata.id, {
      skill,
      enabled: true,
      loadTime: Date.now()
    })
    console.log(`[Skills] Registered skill: ${skill.metadata.name}`)
  }

  /**
   * Unregister a skill
   */
  unregisterSkill(skillId: string): boolean {
    const registered = this.skills.get(skillId)
    if (registered && registered.skill.cleanup) {
      registered.skill.cleanup().catch(console.error)
    }
    return this.skills.delete(skillId)
  }

  /**
   * Enable a skill
   */
  enableSkill(skillId: string): boolean {
    const registered = this.skills.get(skillId)
    if (registered) {
      registered.enabled = true
      return true
    }
    return false
  }

  /**
   * Disable a skill
   */
  disableSkill(skillId: string): boolean {
    const registered = this.skills.get(skillId)
    if (registered) {
      registered.enabled = false
      return true
    }
    return false
  }

  /**
   * Get a skill function
   */
  getFunction(skillId: string, functionName: string): ((...args: any[]) => Promise<any>) | undefined {
    const registered = this.skills.get(skillId)
    if (registered && registered.enabled) {
      return registered.skill.functions?.[functionName]
    }
    return undefined
  }

  /**
   * Get all prompts from enabled skills
   */
  getAllPrompts(): string[] {
    const prompts: string[] = []

    for (const [, registered] of this.skills) {
      if (registered.enabled && registered.skill.prompts) {
        prompts.push(...registered.skill.prompts)
      }
    }

    return prompts
  }

  /**
   * Get all enabled skills
   */
  getEnabledSkills(): SkillMetadata[] {
    const enabled: SkillMetadata[] = []

    for (const [, registered] of this.skills) {
      if (registered.enabled) {
        enabled.push(registered.skill.metadata)
      }
    }

    return enabled
  }

  /**
   * Get all skills
   */
  getAllSkills(): SkillMetadata[] {
    const all: SkillMetadata[] = []

    for (const [, registered] of this.skills) {
      all.push(registered.skill.metadata)
    }

    return all
  }

  /**
   * Find skills by tag
   */
  findByTag(tag: string): SkillMetadata[] {
    const matching: SkillMetadata[] = []

    for (const [, registered] of this.skills) {
      if (registered.skill.metadata.tags?.includes(tag)) {
        matching.push(registered.skill.metadata)
      }
    }

    return matching
  }

  /**
   * Search skills
   */
  search(query: string): SkillMetadata[] {
    const lowerQuery = query.toLowerCase()
    const matching: SkillMetadata[] = []

    for (const [, registered] of this.skills) {
      const meta = registered.skill.metadata
      if (
        meta.name.toLowerCase().includes(lowerQuery) ||
        meta.description.toLowerCase().includes(lowerQuery) ||
        meta.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        matching.push(meta)
      }
    }

    return matching
  }

  /**
   * Get skill count
   */
  getCount(): { total: number; enabled: number } {
    let total = 0
    let enabled = 0

    for (const [, registered] of this.skills) {
      total++
      if (registered.enabled) enabled++
    }

    return { total, enabled }
  }
}

export const skillsManager = new SkillsManager()
