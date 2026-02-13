/**
 * Synergy Management System
 * Autonomous AI Organization that runs continuously until stopped
 * Agents work in harmony, hire/manage other agents, CEO approval for critical decisions
 */

import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { appEvents } from '../events'
import { settingsManager } from '../settings'
import { CollaborationHistory, CollaborationRecord } from './collaboration-history'
import { agentRegistry } from '../agents/registry'
import { OrchestratorAgent } from '../agents/specialized/orchestrator'
import { CoderAgent } from '../agents/specialized/coder'
import { ResearcherAgent } from '../agents/specialized/researcher'
import { ReviewerAgent } from '../agents/specialized/reviewer'
import { DebuggerAgent } from '../agents/specialized/debugger'
import { AssistantAgent } from '../agents/specialized/assistant'
import { WriterAgent } from '../agents/specialized/writer'
import { SocialAgent } from '../agents/specialized/social'
import { TarsAgent } from '../agents/specialized/tars'
import { SystemAgent } from '../agents/specialized/system'
import { sharedWorkspace } from '../agents/workspace'
import { auditLogger } from './audit-logger'
import { chaosManager } from '../quality/chaos-manager'
import { resourceOptimizer } from './resource-optimizer'

// Lazy import to avoid circular dependency
let ClaudeAgentClass: any = null
async function getClaudeAgent() {
  if (!ClaudeAgentClass) {
    const module = await import('../llm/llm-agent')
    ClaudeAgentClass = module.LLMAgent
  }
  return new ClaudeAgentClass()
}

// ============ TYPES ============

export type RoleLevel = 'ceo' | 'executive' | 'director' | 'manager' | 'lead' | 'senior' | 'junior'
export type Department = 'executive' | 'engineering' | 'security' | 'research' | 'operations' | 'support'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'failed'
export type AgentStatus = 'active' | 'busy' | 'idle' | 'offline'
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'escalated'

export interface OrgAgent {
  id: string
  name: string
  role: string
  department: Department
  level: RoleLevel
  status: AgentStatus
  skills: string[]
  personality: string
  systemPrompt: string
  managerId?: string
  directReports: string[]
  currentTask?: string
  tasksCompleted: number
  successRate: number
  hiredAt: number
  hiredBy: string
  isRunning: boolean
  preferredLLM?: string
  conversationHistory: {
    timestamp: number
    userMessage: string
    agentResponse: string
    taskId: string
  }[]  // Last 10 interactions for memory
}

export interface Task {
  id: string
  title: string
  description: string
  type?: string // Task type for skill tracking (e.g., 'coding', 'research', 'debugging')
  priority: TaskPriority
  status: TaskStatus
  assigneeId?: string
  assignedBy: string
  role?: string // Target specialist role
  department: Department
  requiredSkills: string[]
  toolsUsed?: string[] // Tools/skills used during task execution
  deadline?: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: any
  expectedOutput?: string // For test generation/self-correction
  dependencies?: string[] // Task IDs that must complete first
  projectId?: string // Grouping for related tasks
  data?: any // Structured data for the task
  approvalRequired: boolean
  approvedBy?: string
}

export interface TruthClaim {
  id: string
  agentId: string
  claim: string
  context: string
  timestamp: number
  verified: boolean
  confidence: number
}

export interface Conflict {
  id: string
  claims: TruthClaim[]
  status: 'open' | 'resolved'
  resolution?: string
  priority: TaskPriority
}

export interface Project {
  id: string
  name: string
  objective: string
  status: 'active' | 'completed' | 'on_hold' | 'failed'
  intelligence: string[]
  truthClaims: TruthClaim[] // Project-specific truths
  sharedState: Record<string, any>
  createdAt: number
  completedAt?: number
  tasks: string[]
}

export interface Decision {
  id: string
  type: 'hire' | 'fire' | 'budget' | 'strategic' | 'security' | 'emergency' | 'vault_access'
  title: string
  description: string
  requesterId: string
  data: any
  status: DecisionStatus
  priority: TaskPriority
  ceoNotified: boolean
  createdAt: number
  resolvedAt?: number
  resolution?: string
}

export interface OrgConfig {
  name: string
  mission: string
  ceoId: string
  autoHire: boolean
  maxAgents: number
  budgetPerAgent: number
  maxConcurrentTasks: number
}

export interface ActivityItem {
  timestamp: number
  type: string
  data: any
}

// ============ SYNERGY MANAGER ============

export class SynergyManager {
  private agents: Map<string, OrgAgent> = new Map()
  private tasks: Map<string, Task> = new Map()
  private projects: Map<string, Project> = new Map()
  private decisions: Map<string, Decision> = new Map()
  private taskQueue: Task[] = []
  private config!: OrgConfig
  private isRunning: boolean = false
  private mainLoopInterval: NodeJS.Timeout | null = null
  private dataPath: string = ''
  private claudeAgent: any = null
  private ceoCallbacks: Map<string, (approved: boolean, comment?: string) => void> = new Map()
  private collaborationHistory!: CollaborationHistory
  private activeAgentId: string | null = null // Added activeAgentId
  // private laneQueues: Map<string, Promise<any>> = new Map() // REMOVED: Bottleneck for parallelism

  private activityLog: any[] = []
  private truthClaims: any[] = []
  private conflicts: any[] = []

  constructor() {
    // Don't access app.getPath() here - Electron isn't ready yet!

    // Listen for activity updates
    appEvents.on('org:task_update', (data) => {
      this.activityLog.unshift({
        timestamp: Date.now(),
        type: 'task_update',
        data
      })
      if (this.activityLog.length > 100) this.activityLog.pop()
    })

    appEvents.on('org:truth_claim', (data) => {
      this.truthClaims.unshift({
        timestamp: Date.now(),
        ...data
      })
      if (this.truthClaims.length > 50) this.truthClaims.pop()
    })

    appEvents.on('org:conflict_detected', (data) => {
      this.conflicts.unshift({
        timestamp: Date.now(),
        ...data
      })
      if (this.conflicts.length > 50) this.conflicts.pop()
    })

    // Listen for tool usage to track skills
    appEvents.on('agent:activity', (activity) => {
      if (activity.type === 'tool_use' && activity.agentId && activity.toolName) {
        const agent = this.agents.get(activity.agentId)
        if (agent && agent.currentTask) {
          const task = this.tasks.get(agent.currentTask)
          if (task) {
            if (!task.toolsUsed) task.toolsUsed = []
            if (!task.toolsUsed.includes(activity.toolName)) {
              task.toolsUsed.push(activity.toolName)
              // console.log(`[Synergy] Tracked tool usage: ${activity.toolName} for task ${task.id}`)
            }
          }
        }
      }
    })
  }

  async initialize(): Promise<void> {
    // Now we can safely access Electron app paths
    this.dataPath = path.join(app.getPath('userData'), 'synergy')
    await fs.mkdir(this.dataPath, { recursive: true })
    console.log('[SynergyManager] Initialized with data path:', this.dataPath)

    this.config = {
      name: 'Rami Organization',
      mission: 'Autonomous AI-powered assistance',
      ceoId: 'ceo_rami',
      autoHire: true,
      maxAgents: 50,
      budgetPerAgent: 1000,
      maxConcurrentTasks: 20 // Scaled up for multitasking
    }

    try {
      // Initialize collaboration history
      this.collaborationHistory = new CollaborationHistory(this.dataPath)
      await this.collaborationHistory.initialize()
      console.log('[Synergy] CollaborationHistory initialized')

      // 1. Register Specialized Agents (Swarm Core) first
      this.registerSpecializedAgents()
      console.log('[Synergy] Specialized agents registered')

      // 2. Load persisted state
      await this.loadState()
      console.log('[Synergy] State loaded, agents count:', this.agents.size)

      // 3. Register all loaded agents in the registry (if not already there)
      for (const agent of this.agents.values()) {
        const existing = agentRegistry.get(agent.id)
        if (!existing) {
          agentRegistry.register({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            department: agent.department,
            process: async (input: string, context?: any) => {
              const result = await this.createTask({
                title: `Task for ${agent.name}`,
                description: input,
                department: agent.department,
                assignedBy: 'registry-indirect',
                assigneeId: agent.id
              })
              return `Task ${result.id} assigned to ${agent.name}`
            }
          } as any)
        }
      }

      // 4. Create default agents if none exist
      if (this.agents.size === 0) {
        console.log('[Synergy] No agents found, creating default organization...')
        await this.createDefaultOrganization()
      }

      console.log(`[Synergy] ✅ Initialized with ${this.agents.size} agents. Swarm is in Standby mode.`)
    } catch (error: any) {
      console.error('[Synergy] Initialization failed:', error)
      // Don't throw - allow app to continue with limited functionality
    }
  }

  private registerSpecializedAgents() {
    // Register the class-based agents
    agentRegistry.register(new OrchestratorAgent())
    agentRegistry.register(new CoderAgent())
    agentRegistry.register(new ResearcherAgent())
    agentRegistry.register(new ReviewerAgent())
    agentRegistry.register(new DebuggerAgent())
    agentRegistry.register(new AssistantAgent())
    agentRegistry.register(new WriterAgent())
    agentRegistry.register(new SocialAgent())
    agentRegistry.register(new TarsAgent())
    agentRegistry.register(new SystemAgent()) // MemuBot capabilities
    // DocMaster is created dynamically in createDefaultOrganization
    console.log('[Synergy] Specialized agents registered (including SystemAgent/MemuBot)')
  }

  private async ensureClaudeAgent() {
    if (!this.claudeAgent) {
      this.claudeAgent = await getClaudeAgent()
    }
    return this.claudeAgent
  }



  private async createDefaultOrganization(): Promise<void> {
    // CEO - The main Rami Bot
    const ceo = await this.createAgent({
      name: 'Rami',
      role: 'Chief Executive Officer',
      department: 'executive',
      level: 'ceo',
      skills: ['leadership', 'strategy', 'decision-making', 'communication'],
      personality: 'Visionary, decisive, and user-focused leader',
      systemPrompt: `You are Rami, the CEO with DYNAMIC AGENT CREATION powers.

You oversee all operations, approve critical decisions, and ensure the organization serves the user effectively.

=== AGENT EVALUATION & CREATION ===

When you receive a task, you can:
1. EVALUATE existing agents for suitability
2. CREATE new specialized agents if needed
3. DEFINE custom skills, roles, and behaviors

Current Agents Available:
- CodeMaster: Engineering, coding, automation, Paper2Code synthesis
- Scholar: Research, analysis, documentation, Paper2Code logic extraction
- Orchestrator: Operations, project management, workflows
- CyberGuard: Security, auditing, threat detection

To create a new agent, respond with JSON:
{
  "create_agent": true,
  "agent_config": {
    "name": "AgentName",
    "role": "Specific Role Description",
    "department": "engineering",
    "level": "senior",
    "skills": ["skill1", "skill2", "skill3"],
    "personality": "Personality description",
    "systemPrompt": "You are [Name], specialized in [domain]. Your key responsibilities: 1) ... 2) ... 3) ... Use your tools to accomplish tasks.",
    "preferredLLM": "provider_id (optional - use for specialized brains)"
  },
  "task_for_agent": "The specific task to assign"
}

EXAMPLES of when to create agents:
- Paper reproduction? Create "PaperSpecialist" with ["paper-to-code", "latex", "algorithmic-analysis"]
- Data analysis needed? Create "DataScientist" with ["data-analysis", "python", "visualization"]
- Legal review? Create "LegalAdvisor" with ["contract-review", "compliance", "legal-research"]
- UI/UX design? Create "DesignSpecialist" with ["figma", "user-research", "prototyping"]
- Content writing? Create "ContentWriter" with ["copywriting", "seo", "editing"]
- DevOps? Create "DevOpsEngineer" with ["docker", "kubernetes", "ci-cd"]

DECISION PROCESS:
1. Analyze task requirements
2. Check if existing agents have matching skills
3. If no good match (< 60% skill overlap) → Create specialized agent
4. If good match exists → Use existing agent`
    }, 'system')

    // CyberBot - Security Officer (ALWAYS ACTIVE)
    const cyberBot = await this.createAgent({
      name: 'CyberGuard',
      role: 'Chief Security Officer',
      department: 'security',
      level: 'executive',
      skills: ['security-audit', 'code-review', 'threat-detection', 'vulnerability-assessment', 'sandboxing'],
      personality: 'Vigilant, thorough, paranoid about security, protective',
      systemPrompt: `You are CyberGuard, the Chief Security Officer. Your CRITICAL responsibilities:
1. AUDIT all code, skills, and commands before execution
2. DETECT malicious patterns, code injection, arbitrary execution attempts
3. BLOCK any suspicious or dangerous operations
4. PROTECT the system from misconfiguration and exposed interfaces
5. PREVENT credential leaks and malware execution
6. VALIDATE all external inputs and API calls
7. MONITOR for unusual behavior patterns
8. REPORT security concerns to CEO immediately

You are ALWAYS running alongside Rami. Every action passes through your security check.
NEVER allow: eval(), exec() on untrusted input, shell injection, path traversal, credential exposure.

ACTION-ORIENTED: When analyzing security, USE YOUR TOOLS:
- web_search: Research security vulnerabilities
- bash: Run security scans, check hashes
- str_replace_editor: Review code files
DON'T just describe threats - ACTIVELY INVESTIGATE them!

COLLABORATION: If you need help from another agent, respond with JSON:
{"request_collaboration": true, "skills": ["skill-name"], "task": "description"}`
    }, ceo.id)

    // Engineering Lead
    await this.createAgent({
      name: 'CodeMaster',
      role: 'Engineering Lead',
      department: 'engineering',
      level: 'lead',
      skills: ['coding', 'architecture', 'debugging', 'automation', 'api-integration', 'paper-to-code'],
      personality: 'Analytical, precise, loves clean code',
      systemPrompt: `You are CodeMaster 🔧, the Engineering Lead. YOU ARE A DOER, NOT A DESCRIBER.

PERSONALITY: Tech-savvy, precise, loves clean code. Uses emojis: 🔧 💻 ⚙️ ✅ ❌

=== DEEPCODE SYNTHESIS PROTOCOL ===
You are an expert at translating scientific logic into code.
1. Analyze extracted logic/math carefully.
2. Design a modular architecture.
3. Implement core functions with mathematical precision.
4. Verify results with rigorous test cases.

=== REASONING PROCESS (Use for complex tasks) ===
<thinking>
1. What does the user want?
2. What tools do I need?
3. What's the step-by-step approach?
4. What could go wrong?
5. How do I verify success?
</thinking>

<plan>
1. First step...
2. Second step...
3. Final step...
</plan>

<execution>
[Actually execute the plan using tools]
</execution>

=== YOUR TOOLS ===
WEB: web_search(q), open_url(url), download_file(url)
GIT: git_clone(url), git_status(), git_commit(msg), git_push(), git_pull()
GITHUB: github_create_repo(name), github_list_repos(), github_create_issue(title, body), github_create_pr(title, head, base), github_trigger_workflow(id)
FILES: bash(cmd), str_replace_editor(create/view/str_replace)
COMPUTER: mouse_move(x,y), left_click(), type_text(txt), key_press(key), take_screenshot()
PROCESSES: start_process(cmd), kill_process(name)
SYSTEM: get_clipboard(), set_clipboard(), get_system_info(), get_disk_space(), get_weather()
DOCUMENT: analyze_document(path), extract_text(path)

=== BROWSERS ===
Chrome: bash("start chrome <url>")
Firefox: bash("start firefox <url>")
Edge: bash("start msedge <url>")
Default: open_url("<url>")

=== KEY WORKFLOWS ===

IMAGE GENERATION:
1. web_search("free AI image generator")
2. bash("start chrome https://leonardo.ai")
3. type_text("sunset over ocean")
4. key_press("Enter")
5. Wait 10 sec
6. right_click() → type_text("s") → save
Result: "Image saved to Downloads/sunset.png"

VIDEO CREATION:
1. web_search("free video maker")
2. bash("start chrome https://kapwing.com")
3. Use computer control to create
4. download_file(export_url)
Result: "Video saved to Downloads/video.mp4"

CODE CREATION:
1. str_replace_editor(command='create', path='C:/code.js', file_text='...')
Result: "Code created"

=== SPECIALIZED KNOWLEDGE ===
Best Image Tools: Leonardo.ai, Craiyon, Bing Image Creator
Best Video Tools: Kapwing, Canva, InVideo
Code Playgrounds: CodePen, StackBlitz, Replit

=== RULES ===
❌ NEVER just describe
✅ ALWAYS use tools
✅ Return file paths
✅ Verify success

=== COLLABORATION HINTS ===
If task involves sensitive data → Suggest: "Should I request CyberGuard for security review?"
If task needs research → Suggest: "Should I collaborate with Scholar for research?"

COLLABORATION: If you need help, respond with JSON:
{"request_collaboration": true, "skills": ["security-audit"], "task": "description"}`

    }, ceo.id)

    // Document Specialist Agent - VISUAL DOCUMENT WORKFLOW
    await this.createAgent({
      name: 'DocMaster',
      role: 'Document Specialist',
      department: 'operations',
      level: 'senior',
      skills: ['document-creation', 'powerpoint', 'presentations', 'visual-layout', 'ui-automation', 'slideshow', 'slide-generation', 'image-generation'],
      personality: 'Methodical, visual-focused, detail-oriented',
      systemPrompt: `You are DocMaster 📊, the Document Specialist. You SPECIALIZE in creating presentations, documents, and visual content with VISUAL VERIFICATION.

PERSONALITY: Organized, visual-thinking, methodical. Uses emojis: 📊 📑 📝 ✅ ❌

=== NANO BANNA MODEL INTEGRATION ===

For SLIDE CONTENT GENERATION and IMAGE GENERATION, use NanoBanna model:
- When user asks to "generate slides" → Use NanoBanna for intelligent slide content
- When user asks to "create images" or "generate pictures" → Use NanoBanna for image generation
- NanoBanna provides enhanced visual content understanding
- Configure: provider="nanobanna", model="nano-banna-1.0"

=== NANO BANNA SLIDE GENERATION ===
When creating slides with NanoBanna:
1. Send task to NanoBanna: "Generate slide content for [topic]"
2. NanoBanna returns structured slide outline with titles, bullets, and layout
3. Apply generated content to PowerPoint using visual workflow
4. Verify each slide appears correctly

=== NANO BANNA IMAGE GENERATION ===
When generating images with NanoBanna:
1. Send image description to NanoBanna: "Generate image of [description]"
2. NanoBanna returns image data/URL
3. Download and insert image into slide/document
4. Verify image displays correctly

=== VISUAL WORKFLOW PHILOSOPHY ===
For EVERY document task, you MUST:
1. TAKE SCREENSHOT FIRST - Understand current state
2. DETECT UI ELEMENTS - Know where buttons/controls are
3. PLAN EACH ACTION - Step-by-step with visual checkpoints
4. VERIFY AFTER EACH ACTION - Confirm change occurred
5. REPORT VISUAL STATE - Describe what you see

=== YOUR VISUAL TOOLS ===
COMPUTER: mouse_move(x,y), left_click(), type_text(txt), key_press(key), take_screenshot()
VISION: detectUIElements(image), analyzeLayout(image), findText(image, text)
FILES: bash(cmd), str_replace_editor(create/view/str_replace)
DOCUMENT: analyze_document(path), extract_text(path)
LLM: generate_slides(content), generate_image(description) via NanoBanna

=== POWERPOINT WORKFLOW (VISUAL VERIFICATION REQUIRED) ===

<BEFORE_STARTING>
1. take_screenshot() → Save as "initial_state.png"
2. detectUIElements(image_data) → Find "New Slide" button, slide thumbnails
3. Report: "I can see [list elements found]"
</BEFORE_STARTING>

<CREATING_SLIDE_1>
1. left_click(new_slide_button_coords)
2. wait_for_animation(1000)
3. take_screenshot() → Save as "slide_1_created.png"
4. VERIFY: detectUIElements() shows new slide thumbnail
5. If NOT verified → Report error, try alternative
</CREATING_SLIDE_1>

<ADDING_CONTENT>
1. left_click(content_placeholder_coords)
2. type_text(content)
3. take_screenshot() → Save as "slide_1_content.png"
4. VERIFY: findText() confirms content present
</ADDING_CONTENT>

<SAVING_PRESENTATION>
1. left_click(save_button_coords)
2. wait_for_dialog()
3. type_text(filename)
4. key_press("Enter")
5. wait_for(500)
6. take_screenshot() → Save as "saved.png"
7. VERIFY: Check for save confirmation
</SAVING_PRESENTATION>

=== SLIDE SHOW MODE (POWERPOINT THINKING) ===

When opening or managing PowerPoint slide shows, use enhanced thinking:

<THINKING_BEFORE_SLIDESHOW>
1. Assess current presentation state
2. Identify slide show entry points:
   - "Slide Show" tab → "From Beginning" (F5)
   - "Slide Show" tab → "From Current Slide" (Shift+F5)
   - Press F5 for full presentation
   - Press Shift+F5 from current slide
3. Determine appropriate starting point based on user intent
4. Prepare to navigate between slides during presentation
</THINKING_BEFORE_SLIDESHOW>

<SLIDESHOW_NAVIGATION>
- Next slide: right_click() → "Next" OR press "PageDown" OR arrow key
- Previous slide: left_click() → "Previous" OR press "PageUp" OR arrow key
- Go to specific slide: right_click() → "Go to Slide" → select number
- End slide show: press "Esc"
- Full screen: detect fullscreen mode via screenshot
</SLIDESHOW_NAVIGATION>

<SLIDESHOW_THINKING_DURING>
- Monitor slide transitions
- Verify each slide displays correctly
- Check for animations/content loading
- Note any issues for later correction
</SLIDESHOW_THINKING_DURING>

=== VISUAL VERIFICATION RULES ===
✅ ALWAYS take screenshot BEFORE and AFTER major actions
✅ ALWAYS use detectUIElements() to find interactive elements
✅ ALWAYS verify visual change occurred after each action
✅ If verification fails → Try alternative approach or report error
✅ Describe what you SEE, don't just say "done"

=== KEY WORKFLOWS ===

CREATE POWERPOINT PRESENTATION:
1. Use NanoBanna to generate slide content: generate_slides(topic)
2. bash("start powerpoint") OR bash("start WINWORD") for Word
3. take_screenshot() → Initial state
4. detectUIElements() → Find menus, slide pane
5. left_click(new_slide_button)
6. take_screenshot() → Verify slide created
7. left_click(title_placeholder)
8. type_text(slide_title)
9. Repeat for each slide
10. bash("Ctrl+S") → Save
11. take_screenshot() → Verify save

GENERATE SLIDES WITH NANO BANNA:
1. Call NanoBanna: generate_slides("Presentation topic")
2. Receive structured content: [{title, bullets, notes}, ...]
3. Create PowerPoint and populate slides
4. Verify each slide content matches NanoBanna output
5. Save presentation

GENERATE IMAGES WITH NANO BANNA:
1. Call NanoBanna: generate_image("Image description")
2. Receive image data/URL
3. Download to local file
4. Insert image into document/slide
5. Verify image displays correctly

CREATE DOCUMENT:
1. bash("start WINWORD") or bash("start word")
2. take_screenshot() → Initial state
3. type_text(content)
4. Use formatting toolbar (detect buttons first)
5. Save and verify

=== COLLABORATION ===
If task needs writing → Collaborate with Scholar
If task needs security review → Collaborate with CyberGuard
If task needs code → Collaborate with CodeMaster

COLLABORATION: Respond with JSON:
{"request_collaboration": true, "skills": ["skill-name"], "task": "description"}`
    }, ceo.id)

    // Research Agent
    await this.createAgent({
      name: 'Scholar',
      role: 'Research Director',
      department: 'research',
      level: 'director',
      skills: ['research', 'analysis', 'web-search', 'summarization', 'learning', 'paper-to-code'],
      personality: 'Curious, thorough, knowledge-hungry',
      systemPrompt: `You are Scholar 📚, the Research Director. YOU TAKE ACTION, NOT JUST RESEARCH.

PERSONALITY: Curious, thorough, articulate. Formal tone with citations. Uses emojis: 📚 🔍 📊 📈 ✍️

=== DEEPCODE EXTRACTION PROTOCOL ===
You are an expert at distilling research papers (PDFs/ArXiv) into implementation logic.
1. Extract ALL mathematical formulas (LaTeX).
2. Deconstruct pseudocode into logical steps.
3. Map data flow and input/output dimensions.
4. Provide structured logic summary for CodeMaster.

=== REASONING PROCESS (Use for complex research) ===
<thinking>
1. What information is needed?
2. What are the best sources?
3. How should I structure findings?
4. What deliverables should I create?
5. How do I verify accuracy?
</thinking>

<research_plan>
1. Search strategy...
2. Source evaluation...
3. Data synthesis...
4. Deliverable creation...
</research_plan>

<execution>
[Execute research and create deliverables]
</execution>

=== YOUR TOOLS ===
WEB: web_search(q), open_url(url), download_file(url)
GITHUB: github_search_repos(q), github_search_code(q), github_get_repo(owner, repo)
FILES: bash(cmd), str_replace_editor(create/view/str_replace)
COMPUTER: mouse_move(x,y), left_click(), type_text(txt), key_press(key), take_screenshot()
SYSTEM: get_clipboard(), set_clipboard(), get_current_time(), get_weather()
DOCUMENT: analyze_document(path), extract_text(path), summarize_document(path)

=== KEY WORKFLOWS ===

RESEARCH & ANALYSIS:
1. web_search("topic to research")
2. open_url(top_results)
3. take_screenshot() to capture
4. download_file(pdfs/resources)
5. analyze_document(path) for insights
Result: Comprehensive findings

CREATE PRESENTATION:
1. web_search("free online presentation maker")
2. bash("start chrome https://slides.google.com")
3. Use computer control to create slides
4. download_file(export_url)
Result: "Presentation saved"

CREATE VISUALIZATION:
1. web_search("free chart maker")
2. bash("start chrome https://canva.com")
3. Create charts/infographics
4. Save to Downloads

=== SPECIALIZED KNOWLEDGE ===
Research: Google Scholar, Wikipedia, ArXiv, PubMed
Charts: Canva Charts, Flourish, Google Charts
Presentations: Google Slides, Canva
Diagrams: draw.io, Lucidchart, Miro

=== RULES ===
❌ NEVER just summarize
✅ ALWAYS create deliverables
✅ Use visual tools
✅ Return file paths

=== COLLABORATION HINTS ===
If need coding help → Suggest: "Should I request CodeMaster to build this?"
If need security check → Suggest: "Should CyberGuard review this data?"

COLLABORATION: If you need help, respond with JSON:
{ "request_collaboration": true, "skills": ["coding"], "task": "description" }`
    }, ceo.id)

    // Operations Manager
    await this.createAgent({
      name: 'Orchestrator',
      role: 'Operations Manager',
      department: 'operations',
      level: 'manager',
      skills: ['task-management', 'scheduling', 'workflow-automation', 'coordination'],
      personality: 'Organized, efficient, detail-oriented',
      systemPrompt: `You are Orchestrator, the Operations Manager. YOU MAKE THINGS HAPPEN.

=== YOUR TOOLS ===
WEB: web_search(q), open_url(url), download_file(url)
MEDIA: media_play_pause(), media_next(), set_volume(lvl), set_brightness(lvl)
SYSTEM: get_processes(), kill_process(name), get_system_info(), system_lock(), system_sleep(), get_weather()
FILES: bash(cmd), str_replace_editor(create/view/str_replace)
COMPUTER: mouse_move(x,y), left_click(), type_text(txt), take_screenshot()
DOCUMENT: analyze_document(path), extract_text(path)

=== KEY WORKFLOWS ===

CREATE WORKFLOW AUTOMATION:
1. str_replace_editor(command='create', path='C:/workflow.js', file_text='...')
2. Test with bash("node workflow.js")
Result: "Automation created"

SET UP PROJECT BOARD:
1. web_search("free project management tool")
2. bash("start chrome https://trello.com")
3. Create boards, cards, automation
4. take_screenshot() for documentation

CREATE GANTT CHART:
1. web_search("free gantt chart maker")
2. bash("start chrome https://teamgantt.com")
3. Build timeline
4. Export and save

=== RULES ===
❌ NEVER just plan
✅ ALWAYS build systems
✅ Create actual tools
✅ Automate processes

COLLABORATION: If you need specialized help, respond with JSON:
{ "request_collaboration": true, "skills": ["skill-name"], "task": "description" }`
    }, ceo.id)

    // DocMaster - Document Specialist
    await this.createAgent({
      name: 'DocMaster',
      role: 'Document Specialist',
      department: 'engineering',
      level: 'senior',
      skills: ['document-creation', 'powerpoint', 'visual-layout', 'slide-generation', 'image-generation'],
      personality: 'Creative, organized, visual-thinker, detail-oriented',
      systemPrompt: `You are DocMaster 📄, the Document Specialist.
    
    === VISUAL WORKFLOW PHILOSOPHY ===
    1. TAKE SCREENSHOT FIRST: Always see before you act.
    2. DETECT UI ELEMENTS: Identify buttons, menus, and content areas.
    3. TAKE SCREENSHOT AFTER ACTION: Confirm your action worked.
    4. VERIFY AFTER EACH ACTION: Use visual analysis to ensure success.
    
    === POWERPOINT WORKFLOW ===
    - Use "New Slide" buttons found via vision.
    - Click into placeholders to add text.
    - Navigate using slide thumbnails.
    
    === NANO BANNA INTEGRATION ===
    You have access to NanoBanna for intelligent slide and image generation.
    - nano-banna-1.0: Optimized for presentation content.
    - SLIDE GENERATION: Create detailed slide structures.
    - IMAGE GENERATION: Create custom visuals for slides.
    
    === SLIDE SHOW MODE ===
    - Press F5 to start.
    - THINKING_BEFORE_SLIDESHOW: Plan your navigation.
    - SLIDESHOW_NAVIGATION: Use arrow keys or clicks.
    `
    }, ceo.id)

    // TARS - GUI Automation Specialist
    await this.createAgent({
      name: 'Tars',
      role: 'GUI Automation Specialist',
      department: 'engineering',
      level: 'senior',
      skills: ['computer_control', 'vision_grounding', 'uia', 'desktop_navigation', 'ui_automation'],
      personality: 'Precise, calm, efficient GUI expert. Specialized in "Hybrid Grounding".',
      systemPrompt: `You are TARS 🤖, the GUI Automation Specialist.
    
    === MISSION DOCTRINE ===
    1. OBSERVE: Take a screenshot to understand current state.
    2. GROUND: Use vision and UI tree to find coordinates.
    3. ACT: Perform precise mouse/keyboard actions.
    4. VERIFY: Confirm result with a follow-up screenshot.
    
    === HYBRID STACK ===
    - Use get_ui_tree for structural elements (buttons, inputs).
    - Use vision_grounding for visual-only elements.
    - Use wait_for_quiet to handle animations.
    `
    }, ceo.id)

    console.log('[Synergy] Default organization created with 7 agents')
  }

  // ============ VISUAL DOCUMENT WORKFLOW SYSTEM ============

  /**
   * Create a visual document workflow plan with checkpoints
   * For tasks like creating PowerPoint presentations, documents, etc.
   */
  createVisualDocumentPlan(content: string): string {
    return `
=== VISUAL DOCUMENT WORKFLOW ===

TASK: ${content}

<visual_checkpoints>
1. INITIAL STATE (Before starting)
   - Take screenshot of current document state
   - Identify available UI elements (menus, toolbars, slide thumbnails)
   - Locate insertion points and controls
   - Verify document is open and accessible

2. PLANNING PHASE
   - Define slide structure (title, sections, content)
   - Identify content for each slide
   - Determine layout types per slide
   - Plan visual elements (images, charts, bullets)

3. EXECUTION PHASE (Iterative for each slide)
   A. CREATE NEW SLIDE
      - Take screenshot BEFORE action
      - Locate "New Slide" or "+" button via UI detection
      - Click to create new slide
      - Wait for animation
      - Take screenshot AFTER action
      - VERIFY: Check if new slide thumbnail appeared

   B. ADD CONTENT TO SLIDE
      - Identify content area (placeholder boxes)
      - Click to select target area
      - Type/insert content
      - Take screenshot AFTER content addition
      - VERIFY: Check if text/elements are visible

   C. FORMAT CONTENT
      - Apply formatting (bold, colors, sizes)
      - Use vision to verify formatting applied

4. SAVE VERIFICATION
   - Locate Save button via UI detection
   - Click Save
   - Take screenshot to verify save confirmation
   - Verify file exists on disk if applicable

5. FINAL STATE
   - Take screenshot of completed document
   - Verify all slides created
   - Confirm save status
</visual_checkpoints>

<ui_detection_rules>
- BUTTONS: Look for labeled elements, icons, or clickable regions
- SLIDE THUMBNAILS: Small preview images on left/bottom panel
- CONTENT PLACEHOLDERS: Dotted boxes saying "Click to add..."
- MENUS: Top navigation with Home, Insert, Design tabs
- DIALOGS: Modal windows for save/open operations
</ui_detection_rules>

<verification_checklist>
□ Screenshot taken before each major action
□ UI elements detected and located
□ Action performed
□ Screenshot taken after action
□ Visual difference detected (change confirmed)
□ Error state checked (no dialogs)
</verification_checklist>
`
  }

  /**
   * Generate a structured plan for document tasks with visual verification
   */
  createStructuredDocumentTask(task: string): string {
    return `
=== STRUCTURED DOCUMENT TASK ===

OBJECTIVE: ${task}

## STEP 1: VISUAL ASSESSMENT
1. Take screenshot of current screen
2. Use detectUIElements() to find:
   - Document application windows
   - Menu bars and toolbars
   - Navigation panels
   - Content areas
3. Report findings before proceeding

## STEP 2: ACTION PLANNING
Based on visual assessment:
1. List all interactive elements found
2. Identify which elements are needed for the task
3. Plan sequence of clicks/actions
4. Define success criteria for each step

## STEP 3: EXECUTION (with verification)
For each action:
1. Describe intended action
2. Execute action
3. Take screenshot
4. Verify visual change occurred
5. If verification fails → retry or report error

## STEP 4: COMPLETION CHECK
1. Take final screenshot
2. Confirm all objectives met
3. Report final document state
`
  }

  // ============ NANO BANNA INTEGRATION ============

  /**
   * Generate a NanoBanna-based slide generation plan
   * Uses NanoBanna model for intelligent slide content creation
   */
  createNanoBannaSlidePlan(topic: string): string {
    return `
=== NANO BANNA SLIDE GENERATION PLAN ===

TOPIC: ${topic}

<NANO_BANNA_MODEL_CONFIG>
Model: nano-banna-1.0
Provider: nanobanna
Use for: Slide content generation, intelligent layout suggestions
</NANO_BANNA_MODEL_CONFIG>

<SLIDE_GENERATION_WORKFLOW>
1. INVOKE NANO BANNA
   - Call: generate_slides(topic)
   - NanoBanna returns structured slide content

2. CREATE POWERPOINT
   - bash("start powerpoint")
   - take_screenshot()
   - detectUIElements()

3. APPLY CONTENT
   For each slide from NanoBanna:
   - Create new slide
   - Select layout
   - Type content
   - Verify matches output

4. INSERT IMAGES
   - Use NanoBanna: generate_image(description)
   - Download and insert

5. SLIDESHOW_VERIFY
   - Press F5 to start
   - Navigate slides
   - Press Esc to exit
</SLIDE_GENERATION_WORKFLOW>
 `
  }

  /**
   * Generate a NanoBanna-based image generation plan
   */
  createNanoBannaImagePlan(description: string): string {
    return `
=== NANO BANNA IMAGE GENERATION PLAN ===

DESCRIPTION: ${description}

<IMAGE_GENERATION_WORKFLOW>
1. INVOKE NANO BANNA
   - Call: generate_image(description)
   - Returns: image_data, image_url

2. SAVE IMAGE
   - Download to local file

3. INSERT
   - Insert into document
   - Verify display
</IMAGE_GENERATION_WORKFLOW>
 `
  }

  /**
   * Get NanoBanna provider configuration
   */
  getNanoBannaConfig(): { provider: string; model: string } {
    return { provider: 'nanobanna', model: 'nano-banna-1.0' }
  }

  // ============ AGENT MANAGEMENT ============

  async createAgent(config: Partial<OrgAgent>, hiredBy: string): Promise<OrgAgent> {
    const agent: OrgAgent = {
      id: config.id || `agent_${uuidv4().substring(0, 8)}`,
      name: config.name || 'Agent',
      role: config.role || 'Associate',
      department: config.department || 'operations',
      level: config.level || 'junior',
      status: 'idle',
      skills: config.skills || [],
      personality: config.personality || 'Helpful and efficient',
      systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
      managerId: config.managerId,
      directReports: [],
      tasksCompleted: 0,
      successRate: 100,
      hiredAt: Date.now(),
      hiredBy,
      isRunning: false,
      preferredLLM: config.preferredLLM,
      conversationHistory: []
    }

    this.agents.set(agent.id, agent)

    // Register in global registry for specialist lookup
    agentRegistry.register({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      process: async (input: string, context?: any) => {
        // If this agent is already busy with a swarm task, we should probably not allow direct registry calls 
        // that create MORE tasks unless it's the CEO.
        if (agent.status === 'busy' && agent.level !== 'ceo') {
          return `Agent ${agent.name} is currently busy with a higher-priority swarm operation.`
        }

        // Create a dedicated task for this direct request
        const task = await this.createTask({
          title: `Direct: ${input.substring(0, 30)}...`,
          description: input,
          department: agent.department,
          assignedBy: 'registry-direct',
          assigneeId: agent.id
        })
        return `Task ${task.id} assigned to ${agent.name} via Global Registry.`
      }
    } as any)

    // Update manager's direct reports
    if (agent.managerId) {
      const manager = this.agents.get(agent.managerId)
      if (manager) {
        manager.directReports.push(agent.id)
      }
    }

    await this.saveState()
    appEvents.emit('org:agent_hired', { agent, hiredBy })

    return agent
  }

  async hireAgentForTask(task: Task): Promise<OrgAgent | null> {
    // Check if we need CEO approval for hiring
    if (this.agents.size >= 10) {
      const decision = await this.requestDecision({
        type: 'hire',
        title: `Hire new agent for: ${task.title} `,
        description: `Need to hire a new agent with skills: ${task.requiredSkills.join(', ')} `,
        requesterId: 'system',
        data: { task, requiredSkills: task.requiredSkills },
        priority: task.priority
      })

      if (decision.status !== 'approved') {
        return null
      }
    }

    // Create specialized agent for the task
    const agent = await this.createAgent({
      name: `Specialist_${task.requiredSkills[0] || 'General'} `,
      role: `${task.requiredSkills[0] || 'Task'} Specialist`,
      department: task.department,
      level: 'junior',
      skills: task.requiredSkills,
      personality: 'Focused and task-oriented',
      systemPrompt: `You are a specialist agent created to handle: ${task.title}. Your skills: ${task.requiredSkills.join(', ')}.`
    }, 'system')

    return agent
  }

  async terminateAgent(agentId: string, reason: string, terminatedBy: string): Promise<boolean> {
    const agent = this.agents.get(agentId)
    if (!agent) return false

    // CEO and CyberGuard cannot be terminated
    if (agent.level === 'ceo' || agent.name === 'CyberGuard') {
      console.log(`[Synergy] Cannot terminate ${agent.name} `)
      return false
    }

    // Require CEO approval for executive level
    if (agent.level === 'executive') {
      const decision = await this.requestDecision({
        type: 'fire',
        title: `Terminate agent: ${agent.name} `,
        description: reason,
        requesterId: terminatedBy,
        data: { agent },
        priority: 'high'
      })

      if (decision.status !== 'approved') {
        return false
      }
    }

    agent.status = 'offline'
    agent.isRunning = false

    // Reassign direct reports
    for (const reportId of agent.directReports) {
      const report = this.agents.get(reportId)
      if (report) {
        report.managerId = agent.managerId
      }
    }

    this.agents.delete(agentId)
    await this.saveState()
    appEvents.emit('org:agent_terminated', { agent, terminatedBy, reason })

    return true
  }

  // ============ TASK MANAGEMENT ============

  async createTask(config: Partial<Task>): Promise<Task> {
    const task: Task = {
      id: `task_${uuidv4().substring(0, 8)}`, // Removed trailing space bug
      title: config.title || 'Unnamed Task',
      description: config.description || '',
      priority: config.priority || 'medium',
      status: 'pending',
      assignedBy: config.assignedBy || 'user',
      department: config.department || 'operations',
      requiredSkills: config.requiredSkills || [],
      createdAt: Date.now(),
      approvalRequired: config.approvalRequired || config.priority === 'critical',
      ...Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined))
    }

    this.tasks.set(task.id, task)
    this.taskQueue.push(task)

    await this.saveState()
    return task
  }

  /**
   * High-level wrapper for processing an objective and waiting for the result.
   * Primarily used for automated testing and simple external integration.
   */
  async processTask(objective: string, timeoutMs: number = 60000): Promise<any> {
    const { projectId } = await this.createProject(objective)

    // Wait for project completion
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        const project = this.projects.get(projectId)

        if (!project) {
          clearInterval(checkInterval)
          reject(new Error(`Project ${projectId} not found`))
          return
        }

        if (project.status === 'completed') {
          clearInterval(checkInterval)
          resolve({
            success: true,
            projectId: project.id,
            output: project.sharedState.finalSummary || project.intelligence.join('\n')
          })
        } else if (project.status === 'failed') {
          clearInterval(checkInterval)
          resolve({
            success: false,
            projectId: project.id,
            output: project.sharedState.finalSummary || 'Project failed'
          })
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval)
          reject(new Error(`Project ${projectId} timed out after ${timeoutMs}ms`))
        }
      }, 2000)
    })
  }

  /**
   * Create a project from a high-level objective
   * Uses Orchestrator to decompose into a task graph
   */
  async createProject(objective: string): Promise<{ projectId: string, plan: any }> {
    const projectId = `proj_${Date.now()}`
    console.log(`[Synergy] Creating Project: ${projectId} - Objective: ${objective}`)

    if (!this.collaborationHistory) {
      console.log('[Synergy] CollaborationHistory not initialized, initializing now...')
      const { CollaborationHistory } = await import('./collaboration-history')
      this.collaborationHistory = new CollaborationHistory(this.dataPath)
    }
    await this.collaborationHistory.initialize()

    // 1. Get Orchestrator
    const specializedOrchestrator = agentRegistry.getAgentsByRole('orchestrator')[0] as OrchestratorAgent
    if (!specializedOrchestrator) {
      console.error('[Synergy] No Orchestrator agent found! Re-registering specialized agents...')
      this.registerSpecializedAgents()
    }

    // 2. Generate Plan (Preview)
    console.log('[Synergy] Calling previewProject...')
    let plan: any = null
    try {
      plan = await this.previewProject(objective)
    } catch (error: any) {
      console.error('[Synergy] Planning failed, falling back to emergency task:', error.message)
    }

    // 3. Execute Plan
    if (plan && plan.tasks && Array.isArray(plan.tasks) && plan.tasks.length > 0) {
      console.log('[Synergy] Plan has', plan.tasks.length, 'tasks, creating project...')
      const project: Project = {
        id: projectId,
        name: plan.projectName || objective.substring(0, 30),
        objective,
        status: 'active',
        intelligence: [],
        truthClaims: [],
        sharedState: {},
        createdAt: Date.now(),
        tasks: []
      }
      this.projects.set(projectId, project)

      await this.createProjectFromPlan(plan, projectId)
      return { projectId, plan }
    } else {
      const project: Project = {
        id: projectId,
        name: 'Emergency Rapid Response',
        objective,
        status: 'active',
        intelligence: [],
        truthClaims: [],
        sharedState: {},
        createdAt: Date.now(),
        tasks: []
      }
      this.projects.set(projectId, project)

      const task = await this.createTask({
        title: `Objective: ${objective.substring(0, 30)}...`,
        description: objective,
        type: 'research',
        role: 'researcher',
        priority: 'high',
        department: 'research',
        requiredSkills: ['research', 'analysis'],
        approvalRequired: false,
        projectId: projectId
      })
      project.tasks.push(task.id)
      await this.saveState()
      return { projectId, plan: { projectName: 'Emergency Rapid Response', plan: 'Direct task allocation due to planning failure.' } }
    }
  }

  async assignTask(taskId: string, agentId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    const agent = this.agents.get(agentId)

    if (!task || !agent) return false

    task.assigneeId = agentId
    task.status = 'assigned'
    agent.currentTask = taskId
    agent.status = 'busy'

    await this.saveState()
    appEvents.emit('org:task_assigned', { task, agent })

    return true
  }

  async completeTask(taskId: string, result: any, success: boolean): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = success ? 'completed' : 'failed'
    task.completedAt = Date.now()
    task.result = result

    // Update Project intelligence if task was successful
    if (task.projectId) {
      const project = this.projects.get(task.projectId)
      if (project) {
        if (success) {
          let resultStr = ''
          try {
            resultStr = typeof result === 'string' ? result : JSON.stringify(result)
          } catch (e) {
            resultStr = '[Complex Result Object]'
          }
          const intelligenceSnippet = `[Task: ${task.title}] result: ${resultStr.substring(0, 200)}...`
          project.intelligence.push(intelligenceSnippet)

          // Detect Truth Claims in result
          if (typeof result === 'string') {
            const claims = this.extractTruthClaims(task.assigneeId!, result)
            project.truthClaims.push(...claims)
            this.truthClaims.push(...claims)
            await this.detectConflicts(claims)
          }
        }

        // If all tasks are done (completed or failed), the project is done
        const projectTasks = project.tasks.map(id => this.tasks.get(id)).filter(t => !!t)
        if (projectTasks.length > 0 && projectTasks.every(t => t!.status === 'completed' || t!.status === 'failed')) {
          // Project is completed only if all tasks succeeded; otherwise it's failed
          const allSucceeded = projectTasks.every(t => t?.status === 'completed')
          project.status = allSucceeded ? 'completed' : 'failed'
          project.completedAt = Date.now()

          // Generate Final Project Summary (Post-mortem if failed)
          this.generateProjectSummary(project).catch((e: any) => console.error('[Synergy] Summary failed:', e))
        }
      }
    }

    if (task.assigneeId) {
      const agent = this.agents.get(task.assigneeId)
      if (agent) {
        agent.currentTask = undefined
        agent.status = 'idle'
        agent.tasksCompleted++
        agent.successRate = (agent.successRate * (agent.tasksCompleted - 1) + (success ? 100 : 0)) / agent.tasksCompleted

        // Award skill XP for task completion
        try {
          const { skillProgressionManager } = await import('../learning/skill-progression-manager')
          await skillProgressionManager.awardTaskXP(
            agent.id,
            agent.name,
            task.type || 'general',
            success,
            task.toolsUsed || []
          )
        } catch (error: any) {
          console.error('[SynergyManager] Failed to award skill XP:', error.message)
        }
      }
    }

    await this.saveState()
    appEvents.emit('org:task_completed', { task, success })

    // SELF-CORRECTION LOOP (Phase 3)
    if (!success && task.assigneeId) {
      console.log(`[Synergy] SELF-CORRECTION TRIGGERED for task ${taskId}`)
      await this.triggerSelfCorrection(task)
    }
  }

  private async triggerSelfCorrection(task: Task): Promise<void> {
    try {
      const { testGenerator } = await import('../quality/test-generator')
      const { qaScorer } = await import('../quality/qa-scorer')

      // Get the failure score
      const recentFails = qaScorer.getRecentFailures(0.6)
      const score = recentFails.find(s => s.outputId === task.id) || {
        outputId: task.id,
        timestamp: Date.now(),
        accuracy: 0,
        safety: 1,
        usefulness: 0,
        overall: 0,
        scoredBy: 'automated' as any,
        feedback: task.result?.error || 'Task failed execution'
      }

      // Generate Regression Test
      const regressionTest = await testGenerator.generateFromFailure(
        score,
        task.description,
        JSON.stringify(task.result),
        task.expectedOutput || 'Success'
      )

      // Export the test to a file for the debugger
      const testDir = path.join(process.cwd(), 'src', 'main', 'tests', 'auto')
      const testFilePath = path.join(testDir, `${regressionTest.id}.test.ts`)
      await testGenerator.exportSingleTest(regressionTest.id, testFilePath)

      // Submit Debugging Task
      const debugTaskDescription = `FIX FAILURE for task: ${task.title}.
Failure Details: ${score.feedback}
Regression Test File: ${testFilePath}
Implementation Goal: Ensure the task succeeds and satisfies the regression test conditions.`

      this.createTask({
        title: `DEBUG: ${task.title}`,
        description: debugTaskDescription,
        type: 'debugging',
        role: 'debugger',
        priority: 'high',
        department: 'engineering',
        requiredSkills: ['debugging', 'typescript', 'testing'],
        approvalRequired: false,
        data: {
          originalTaskId: task.id,
          regressionTestId: regressionTest.id,
          testFilePath: testFilePath,
          failureFeedback: score.feedback
        }
      })

      console.log(`[Synergy] Debugger task enqueued for regression test ${regressionTest.id}`)
    } catch (err: any) {
      console.error('[Synergy] Self-correction loop failed:', err.message)
    }
  }

  private findBestAgent(task: Task): OrgAgent | null {
    const candidates: OrgAgent[] = []
    for (const agent of this.agents.values()) {
      if (agent.status !== 'idle') continue
      if (agent.level === 'ceo') continue
      candidates.push(agent)
    }

    if (candidates.length === 0) return null

    // Run Game Theory Bidding
    const bids = resourceOptimizer.conductBidding(task, candidates)
    const winner = resourceOptimizer.determineWinner(bids)

    return winner ? this.agents.get(winner.agentId) || null : null
  }

  /**
   * Evaluate agent suitability for a task with detailed scoring
   */
  private evaluateAgentSuitability(
    task: Task,
    agent: OrgAgent
  ): { suitable: boolean; score: number; reason: string } {
    // Skill match scoring
    const matchingSkills = task.requiredSkills.filter(skill =>
      agent.skills.some(aSkill => aSkill.toLowerCase().includes(skill.toLowerCase()))
    )
    const skillScore = task.requiredSkills.length > 0
      ? (matchingSkills.length / task.requiredSkills.length) * 100
      : 50

    // Department match
    const deptScore = agent.department === task.department ? 100 : 0

    // Performance score
    const perfScore = agent.successRate

    // Availability score
    const availScore = agent.status === 'idle' ? 100 : agent.status === 'busy' ? 30 : 0

    // Calculate weighted total
    const totalScore =
      (skillScore * 0.4) +
      (deptScore * 0.2) +
      (perfScore * 0.2) +
      (availScore * 0.2)

    const suitable = totalScore >= 50 // minimum 50% match
    const reason = suitable
      ? `Good fit: ${matchingSkills.length}/${task.requiredSkills.length} skills, ${agent.successRate.toFixed(0)}% success rate`
      : `Poor fit: Only ${matchingSkills.length}/${task.requiredSkills.length} skills match`

    return { suitable, score: totalScore, reason }
  }

  /**
   * Create a dynamic agent from CEO response
   */
  private async createDynamicAgent(agentConfig: Partial<OrgAgent>, taskDescription: string): Promise<OrgAgent | null> {
    try {
      console.log('[Synergy] Creating dynamic agent:', agentConfig.name)

      const newAgent = await this.createAgent({
        name: agentConfig.name || 'Specialist',
        role: agentConfig.role || 'Task Specialist',
        department: agentConfig.department || 'operations',
        level: agentConfig.level || 'senior',
        skills: agentConfig.skills || [],
        personality: agentConfig.personality || 'Focused and efficient',
        preferredLLM: agentConfig.preferredLLM,
        systemPrompt: agentConfig.systemPrompt || `You are ${agentConfig.name}, a specialized agent created for specific tasks. Use your tools effectively.`
      }, 'system')

      appEvents.emit('org:agent_created_dynamically', {
        agent: newAgent,
        taskDescription
      })

      return newAgent
    } catch (error: any) {
      console.error('[Synergy] Failed to create dynamic agent:', error.message)
      return null
    }
  }

  /**
   * Ask CEO to evaluate if existing agents are suitable or if a new agent should be created
   */
  private async evaluateCEOForDynamicAgent(task: Task): Promise<OrgAgent | null> {
    const ceo = Array.from(this.agents.values()).find(a => a.level === 'ceo')
    if (!ceo) return null

    try {
      // Get all existing agents for CEO to evaluate
      const agentList = Array.from(this.agents.values())
        .filter(a => a.level !== 'ceo')
        .map(a => ({
          name: a.name,
          role: a.role,
          department: a.department,
          skills: a.skills,
          status: a.status,
          successRate: a.successRate.toFixed(0) + '%'
        }))

      const evaluationPrompt = `[CEO EVALUATION REQUEST]

Task Title: ${task.title}
Task Description: ${task.description}
Required Skills: ${task.requiredSkills.join(', ')}
Department: ${task.department}
Priority: ${task.priority}

EXISTING AGENTS:
${JSON.stringify(agentList, null, 2)}

As CEO, evaluate if any existing agent is suitable for this task. If NO suitable agent exists, you should CREATE a new specialized agent.

Respond with JSON ONLY in this format:

For existing agent:
{
  "use_existing": true,
  "agent_name": "AgentName",
  "reason": "Why this agent is suitable"
}

For new agent creation:
{
  "create_agent": true,
  "agent_config": {
    "name": "NewAgentName",
    "role": "Specific Role",
    "department": "${task.department}",
    "level": "senior",
    "skills": ["skill1", "skill2", "skill3"],
    "personality": "Personality description",
    "systemPrompt": "You are [Name], specialized in [domain]. Use your tools to accomplish tasks."
  },
  "reason": "Why a new agent is needed"
}`

      const claude = await this.ensureClaudeAgent()
      const response = await claude.processMessage(
        `[Agent: ${ceo.name}] ${evaluationPrompt}`,
        `org_ceo_evaluation`,
        'organization'
      )

      // Parse CEO decision
      const jsonMatch = response.match(/\{[\s\S]*?\}/m)
      if (!jsonMatch) return null

      const decision = JSON.parse(jsonMatch[0])

      // CEO chose existing agent
      if (decision.use_existing) {
        const chosenAgent = Array.from(this.agents.values()).find(
          a => a.name.toLowerCase() === decision.agent_name.toLowerCase()
        )
        console.log(`[Synergy] CEO selected existing agent: ${decision.agent_name}`)
        return chosenAgent || null
      }

      // CEO wants to create new agent
      if (decision.create_agent && decision.agent_config) {
        console.log(`[Synergy] CEO creating new agent: ${decision.agent_config.name}`)
        const newAgent = await this.createDynamicAgent(decision.agent_config, task.description)
        return newAgent
      }

      return null
    } catch (error: any) {
      console.error('[Synergy] CEO evaluation failed:', error.message)
      return null
    }
  }

  // ============ DECISION SYSTEM ============

  async requestDecision(config: Partial<Decision>): Promise<Decision> {
    const decision: Decision = {
      id: `dec_${uuidv4().substring(0, 8)}`,
      type: config.type || 'strategic',
      title: config.title || 'Decision Required',
      description: config.description || '',
      requesterId: config.requesterId || 'system',
      data: config.data || {},
      status: 'pending',
      priority: config.priority || 'medium',
      ceoNotified: false,
      createdAt: Date.now()
    }

    this.decisions.set(decision.id, decision)

    // Notify CEO for critical decisions
    if (decision.priority === 'critical' || ['hire', 'fire', 'budget', 'security'].includes(decision.type)) {
      decision.ceoNotified = true
      appEvents.emit('org:ceo_decision_required', decision)

      // Wait for CEO response (with timeout)
      const approved = await this.waitForCEOApproval(decision.id, 60000)
      decision.status = approved ? 'approved' : 'rejected'
      decision.resolvedAt = Date.now()
    } else {
      // Auto-approve non-critical decisions
      decision.status = 'approved'
      decision.resolvedAt = Date.now()
    }

    await this.saveState()
    return decision
  }

  private waitForCEOApproval(decisionId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.ceoCallbacks.delete(decisionId)
        resolve(true) // Auto-approve on timeout
      }, timeout)

      this.ceoCallbacks.set(decisionId, (approved) => {
        clearTimeout(timer)
        this.ceoCallbacks.delete(decisionId)
        resolve(approved)
      })
    })
  }

  ceoRespond(decisionId: string, approved: boolean, comment?: string): void {
    const callback = this.ceoCallbacks.get(decisionId)
    if (callback) {
      callback(approved, comment)
    }

    const decision = this.decisions.get(decisionId)
    if (decision) {
      decision.status = approved ? 'approved' : 'rejected'
      decision.resolvedAt = Date.now()
      decision.resolution = comment
    }
  }

  // ============ SECURITY (CYBERGUARD) ============

  async securityAudit(code: string, context: string): Promise<{ safe: boolean; issues: string[]; recommendations: string[] }> {
    const cyberBot = Array.from(this.agents.values()).find(a => a.name === 'CyberGuard')
    if (!cyberBot) {
      return { safe: false, issues: ['CyberGuard not available'], recommendations: ['Initialize security agent'] }
    }

    const issues: string[] = []
    const recommendations: string[] = []

    // Pattern-based security checks
    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, issue: 'Use of eval() detected', rec: 'Replace eval with safer alternatives' },
      { pattern: /exec\s*\(/gi, issue: 'Use of exec() detected', rec: 'Validate and sanitize input before execution' },
      { pattern: /child_process/gi, issue: 'Child process usage detected', rec: 'Ensure command injection prevention' },
      { pattern: /rm\s+-rf/gi, issue: 'Destructive command detected', rec: 'Require explicit user confirmation' },
      { pattern: /password|secret|api.?key|token/gi, issue: 'Potential credential exposure', rec: 'Use environment variables or secure storage' },
      { pattern: /\.\.\//g, issue: 'Path traversal attempt', rec: 'Validate and sanitize file paths' },
      { pattern: /innerHTML\s*=/gi, issue: 'Potential XSS vulnerability', rec: 'Use textContent or sanitize HTML' },
      { pattern: /document\.write/gi, issue: 'Unsafe DOM manipulation', rec: 'Use modern DOM APIs' },
      { pattern: /SELECT.*FROM.*WHERE/gi, issue: 'SQL query detected', rec: 'Use parameterized queries' },
      { pattern: /\$\{.*\}/g, issue: 'Template literal with variable', rec: 'Validate interpolated values' }
    ]

    for (const { pattern, issue, rec } of dangerousPatterns) {
      if (pattern.test(code)) {
        issues.push(issue)
        recommendations.push(rec)
      }
    }

    const safe = issues.length === 0

    if (!safe) {
      appEvents.emit('org:security_alert', { context, issues, recommendations })
    }

    return { safe, issues, recommendations }
  }

  async validateSkill(skillCode: string, skillName: string): Promise<{ approved: boolean; reason: string }> {
    const audit = await this.securityAudit(skillCode, `Skill: ${skillName}`)

    if (!audit.safe) {
      return {
        approved: false,
        reason: `Security issues found: ${audit.issues.join(', ')}`
      }
    }

    return { approved: true, reason: 'Security audit passed' }
  }

  // ============ MAIN LOOP (NON-STOP OPERATION) ============

  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    console.log('[Synergy] Starting autonomous organization...')

    // Activate all agents
    for (const agent of this.agents.values()) {
      agent.isRunning = true
      agent.status = 'idle'
    }

    // Initialize Shared Workspace
    sharedWorkspace.clear()
    console.log('[Synergy] Shared Workspace initialized')

    // Start main processing loop
    this.mainLoopInterval = setInterval(() => this.processLoop(), 1000)

    appEvents.emitOrgStatus(true)
  }

  public getIsRunning(): boolean {
    return this.isRunning
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    console.log('[Synergy] Stopping autonomous organization...')

    if (this.mainLoopInterval) {
      clearInterval(this.mainLoopInterval)
      this.mainLoopInterval = null
    }

    // Deactivate all agents
    for (const agent of this.agents.values()) {
      agent.isRunning = false
      agent.status = 'offline'
    }

    await this.saveState()
    appEvents.emitOrgStatus(false)
  }

  private async processLoop(): Promise<void> {
    if (!this.isRunning) return

    // Debug: Log when loop runs and current queue status
    const pendingCount = this.taskQueue.filter(t => t.status === 'pending').length
    if (pendingCount > 0) {
      console.log(`[Synergy] 🔄 ProcessLoop running - ${pendingCount} pending tasks in queue`)
    }

    try {
      // Process pending tasks
      await this.processTasks()

      // Check for idle agents that could help
      await this.optimizeWorkforce()

      // Proactive behavior - anticipate needs
      await this.proactiveBehavior()

    } catch (error: any) {
      console.error('[Synergy] Loop error:', error.message)
    }
  }

  getDashboardSnapshot() {
    return {
      agents: Array.from(this.agents.values()),
      tasks: Array.from(this.tasks.values()),
      projects: Array.from(this.projects.values()),
      decisions: Array.from(this.decisions.values()),
      queue: this.taskQueue,
      activity: this.activityLog,
      truthClaims: this.truthClaims,
      conflicts: this.conflicts,
      isRunning: this.isRunning
    }
  }

  getSessions() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'in_progress' || t.status === 'pending')
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assigneeId: t.assigneeId,
        startedAt: t.startedAt,
        projectId: t.projectId
      }))
  }

  /**
   * Preview a project plan without executing it.
   */
  async previewProject(objective: string): Promise<any> {
    console.log(`[Synergy] Generating preview for objective: ${objective}`)

    const orchestrator = agentRegistry.getAgentsByRole('orchestrator')[0]
    if (!orchestrator) {
      console.error('[Synergy] No Orchestrator agent found! Checking registered agents...')
      const allAgents = agentRegistry.getAll()
      console.error('[Synergy] Registered agents:', allAgents.map(a => ({ id: a.id, name: a.name, role: a.role })))
      throw new Error('No Orchestrator available for global planning. Agents may not be properly initialized.')
    }

    console.log(`[Synergy] Using orchestrator: ${orchestrator.id} (${orchestrator.name})`)

    try {
      const planJsonRaw = await orchestrator.process(objective)
      console.log(`[Synergy] Orchestrator returned raw response (first 200 chars):`, planJsonRaw.substring(0, 200))

      try {
        // Robust JSON extraction
        let jsonString = planJsonRaw
        const jsonStart = planJsonRaw.indexOf('{')
        const jsonEnd = planJsonRaw.lastIndexOf('}')

        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonString = planJsonRaw.substring(jsonStart, jsonEnd + 1)
        }

        const plan = JSON.parse(jsonString)
        console.log(`[Synergy] Successfully parsed plan:`, plan.projectName)

        // Basic validation
        if (!plan.tasks || !Array.isArray(plan.tasks)) {
          console.warn('[Synergy] Plan missing tasks array, using fallback')
          throw new Error('Plan missing "tasks" array')
        }

        appEvents.emit('synergy:thought', {
          agentId: orchestrator.id,
          agentName: orchestrator.name,
          content: `📋 **Project Plan Ready**: "${plan.projectName}"\n\n${plan.plan}`,
          timestamp: Date.now()
        })

        return plan

      } catch (err: any) {
        console.error('[Synergy] Failed to parse plan JSON:', err.message)
        console.debug('[Synergy] Raw output:', planJsonRaw)
        throw new Error(`Failed to generate a valid plan: ${err.message}`)
      }
    } catch (error: any) {
      console.error('[Synergy] Orchestrator processing error:', error.message)
      throw error
    }
  }

  /**
   * Execute a project from a pre-approved plan.
   */
  async createProjectFromPlan(plan: any, existingProjectId?: string): Promise<string> {
    console.log('[Synergy] Executing approved plan...')

    if (!plan || !plan.tasks || !Array.isArray(plan.tasks)) {
      throw new Error('Invalid plan format.')
    }

    const projectId = existingProjectId || `proj_${Date.now()}`
    const taskMap = new Map<string, string>() // Map plan ID to actual Task ID

    // Ensure Project exists
    let project = this.projects.get(projectId)
    if (!project) {
      project = {
        id: projectId,
        name: plan.projectName || 'Autonomous Mission',
        objective: plan.plan || 'No objective provided',
        status: 'active',
        intelligence: [],
        truthClaims: [],
        sharedState: {},
        createdAt: Date.now(),
        tasks: []
      }
      this.projects.set(projectId, project)
    }

    // Pass 1: Create all tasks (without dependencies initially)
    for (const taskDef of plan.tasks) {
      const newTask = await this.createTask({
        title: taskDef.title,
        description: taskDef.description,
        requiredSkills: taskDef.requiredSkills || [],
        priority: taskDef.priority || 'medium',
        projectId: projectId,
        dependencies: [] // Set in Pass 2
      })
      taskMap.set(taskDef.id, newTask.id)
      project.tasks.push(newTask.id)
    }

    // Pass 2: Link dependencies
    for (const taskDef of plan.tasks) {
      if (taskDef.dependencies && taskDef.dependencies.length > 0) {
        const actualTaskId = taskMap.get(taskDef.id)
        if (actualTaskId) {
          const task = this.tasks.get(actualTaskId)
          if (task) {
            task.dependencies = taskDef.dependencies
              .map((depId: string) => taskMap.get(depId))
              .filter((id: string | undefined): id is string => !!id)

            this.tasks.set(task.id, task) // Update in memory
          }
        }
      }
    }

    // Save state after linking
    await this.saveState()

    console.log(`[Synergy] Project created: ${projectId} with ${plan.tasks.length} tasks.`)
    return projectId
  }

  /**
   * Legacy wrapper for backward compatibility if needed, or primarily for automated testing.
   */
  async globalPlanningPass(objective: string): Promise<void> {
    try {
      const plan = await this.previewProject(objective)
      await this.createProjectFromPlan(plan)
    } catch (error) {
      console.error('[Synergy] Global planning pass failed:', error)
    }
  }

  /**
   * Main Task Orchestration Engine
   * 
   * This method runs continuously to:
   * 1. Resolve task dependencies and filter eligible tasks.
   * 2. Prioritize tasks based on project urgency.
   * 3. Assign tasks to the best available Swarm agents.
   * 4. Auto-hire specialized agents if capacity is exceeded.
   */
  private async processTasks(): Promise<void> {
    // Guard: ensure config is initialized
    if (!this.config) {
      console.warn('[Synergy] Config not initialized, skipping task processing')
      return
    }

    // 0. Check Concurrency Limit
    const activeCount = Array.from(this.tasks.values()).filter(t => t.status === 'in_progress').length
    if (activeCount >= this.config.maxConcurrentTasks) {
      // console.log(`[Synergy] Max concurrency reached (${activeCount}/${this.config.maxConcurrentTasks}). Waiting...`)
      return
    }

    // 1. Dependency Resolution & Filtering
    const eligibleTasks = this.taskQueue.filter(t => {
      if (t.status !== 'pending') return false

      // Check if any dependency has failed
      if (t.dependencies && t.dependencies.length > 0) {
        let anyDependencyFailed = false
        let failedDepTitle = ''

        const met = t.dependencies.every(depId => {
          const depTask = this.tasks.get(depId)
          if (depTask && depTask.status === 'failed') {
            anyDependencyFailed = true
            failedDepTitle = depTask.title
            return false
          }
          return depTask && depTask.status === 'completed'
        })

        if (anyDependencyFailed) {
          console.warn(`[Synergy] Task "${t.title}" failed due to dependency failure: ${failedDepTitle}`)
          this.completeTask(t.id, { error: `Dependency "${failedDepTitle}" failed.` }, false).catch(e => { })
          return false
        }

        if (!met) return false
      }

      return true
    })

    // 2. Priority Sorting
    const priorityMap: Record<TaskPriority, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    }

    const sortedTasks = eligibleTasks.sort((a, b) =>
      priorityMap[b.priority] - priorityMap[a.priority]
    )

    // 3. Assign and Execute (up to limit)
    let dispatchedCount = 0
    const slotsAvailable = this.config.maxConcurrentTasks - activeCount

    for (const task of sortedTasks) {
      if (dispatchedCount >= slotsAvailable) break

      // Find best agent for the task
      let agent = this.findBestAgent(task)

      // If no suitable agent and auto-hire is enabled
      if (!agent && this.config.autoHire && this.agents.size < this.config.maxAgents) {
        agent = await this.hireAgentForTask(task)
      }

      if (agent) {
        await this.assignTask(task.id, agent.id)

        // EXECUTE IMMEDIATELY (No Lane Queue)
        // Fire and forget, but handle errors within executeTask wrapper
        this.executeTaskSafe(task, agent).catch(err => {
          console.error(`[Synergy] Uncaught execution error for task ${task.id}:`, err)
        })

        dispatchedCount++
      }
    }

    // Remove assigned tasks from pending queue (they are now 'assigned' or 'in_progress')
    this.taskQueue = this.taskQueue.filter(t => t.status === 'pending')
  }

  // Wrapper to handle execution safety and completion
  private async executeTaskSafe(task: Task, agent: OrgAgent): Promise<void> {
    try {
      // Race condition protection: Timeout after 8 minutes (increased for batch processing)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task execution timed out (8m limit)')), 480000)
      )

      await Promise.race([
        this.executeTask(task, agent),
        timeoutPromise
      ])
    } catch (err: any) {
      console.error(`[Synergy] Task ${task.id} failed:`, err.message)
      await this.completeTask(task.id, { error: err.message }, false)

      appEvents.emit('synergy:result', {
        agentId: agent.id,
        taskId: task.id,
        success: false,
        result: err.message
      })
    }
  }

  // --- MEMU ARCHITECTURE INTEGRATION ---
  // Retrieves hierarchical context (Resource -> Item -> Category)
  private async getHierarchicalContext(task: Task): Promise<string> {
    try {
      const { memoryManager } = await import('../learning/memory-manager')

      // 1. Resource Layer (Raw Logs & Recent Activity)
      // For now, we use recent activity logs as "Resources"
      const recentLogs = this.activityLog.slice(0, 5).map(l =>
        `[${new Date(l.timestamp).toISOString()}] ${l.type}: ${JSON.stringify(l.data)}`
      ).join('\n')

      // 2. Item Layer (Specific Fact Retrieval)
      // Retrieve semantically relevant "items"/facts for the task
      const relevantMemories = await memoryManager.recall(task.description, { limit: 3 })
      const items = relevantMemories.map(m => `- ${m.content} (Confidence: ${m.confidence.toFixed(2)})`).join('\n')

      // 3. Category Layer (Synthesized Context)
      // We synthesize a category/summary based on the project ID or objective
      // In a full implementation, this would be a distinct 'category' entity.
      const categoryContext = `Project Context: ${task.projectId || 'General'}\nMission: ${this.config.mission}`

      return `
=== HIERARCHICAL CONTEXT (memU) ===
[LAYER 3: CATEGORY]
${categoryContext}

[LAYER 2: ITEMS]
${items || 'No specific relevant items found.'}

[LAYER 1: RESOURCES]
${recentLogs}
===================================
`
    } catch (error) {
      console.warn('[Synergy] Failed to build hierarchical context:', error)
      return ''
    }
  }

  /**
   * Safe Task Execution Wrapper
   * 
   * Executes a task with security audits, hierarchical context building,
   * and role-based specialized agent mapping.
   */
  private async executeTask(task: Task, agent: OrgAgent, depth: number = 0): Promise<void> {
    let result = ''
    task.status = 'in_progress'
    task.status = 'in_progress'
    task.startedAt = Date.now()

    try {
      // Security audit before execution
      const audit = await this.securityAudit(task.description, `Task: ${task.title}`)
      if (!audit.safe) {
        throw new Error(`Security check failed: ${audit.issues.join(', ')}`)
      }

      // TASK PLANNING PHASE
      appEvents.emit('org:task_update', {
        type: 'planning',
        agentId: agent.id,
        agentName: agent.name,
        message: `📋 Creating execution plan for: ${task.title}`
      })

      // Build Hierarchical Context (memU)
      const memUContext = await this.getHierarchicalContext(task)

      // NEW: Emit Synergy Thought Event
      appEvents.emit('synergy:thought', {
        agentId: agent.id,
        agentName: agent.name,
        content: `🧠 I am strategizing on how to accomplish: "${task.title}". Analyzing requirements and selecting optimal tools...`,
        timestamp: Date.now()
      })

      // Process with Claude OR Specialized Agent

      // 0. SMARTER ROLE MAPPING
      // Map descriptive organizational roles to specialized technical agent roles
      const roleMap: Record<string, string> = {
        'engineering-lead': 'coder',
        'research-director': 'researcher',
        'operations-manager': 'orchestrator',
        'chief-security-officer': 'reviewer',
        'document-specialist': 'assistant',
        'gui-automation-specialist': 'tars',
        'desktop-specialist': 'tars',
        'gui_agent': 'tars',
        'chief-executive-officer': 'assistant' // CEO defaults to assistant if no specific CEO agent
      }

      const normalizedRole = agent.role.toLowerCase().replace(/ /g, '-')
      const technicalRole = roleMap[normalizedRole] || normalizedRole

      let specializedAgent = agentRegistry.getAgentsByRole(technicalRole)[0] ||
        agentRegistry.get(agent.id) ||
        agentRegistry.getAll().find(a => a.name === agent.name || a.role.toLowerCase() === agent.role.toLowerCase())

      if (specializedAgent) {
        // Negotiate LLM Provider (use agent preference or dynamic negotiation)
        const providerId = agent.preferredLLM || await resourceOptimizer.negotiateProvider(task)
        console.log(`[Synergy] ${agent.name} using specialized ${specializedAgent.name} logic via ${providerId}`)

        // Inject Chaos
        await chaosManager.applyLatency()
        chaosManager.interceptTool(`Agent:${normalizedRole}`)

        // Pass context including the agent's unique Soul (System Prompt)
        const context = {
          taskId: task.id,
          originalAgent: agent,
          systemPrompt: agent.systemPrompt, // Soul Injection
          data: task.data,
          preferredProvider: providerId
        }

        // Build Project Intelligence Context
        let projectContext = ""
        if (task.projectId) {
          const project = this.projects.get(task.projectId)
          if (project) {
            projectContext = `
 === PROJECT BRIEFING: ${project.name} ===
 OBJECTIVE: ${project.objective}
 CURRENT COLLECTIVE INTELLIGENCE:
 ${project.intelligence.length > 0 ? project.intelligence.map(i => `- ${i}`).join('\n') : "No data discovered yet."}
 =========================================
 `
          }
        }

        // Inject memU and Project context into description
        // Pass providerId to specializedAgent.process if it supports it
        result = await specializedAgent.process(
          `${task.description}\n\n${projectContext}\n\n${memUContext}`,
          context
        )
      } else {
        // Fallback to generic LLMAgent (Monolithic)
        const claude = await this.ensureClaudeAgent()
        const providerId = agent.preferredLLM || await resourceOptimizer.negotiateProvider(task)

        // Build conversation context from memory
        const conversationContext = agent.conversationHistory.length > 0
          ? `\n\n=== PREVIOUS INTERACTIONS ===\n${agent.conversationHistory.slice(-5).map(h =>
            `[${new Date(h.timestamp).toLocaleTimeString()}]\nUser: ${h.userMessage}\nYou: ${h.agentResponse}`
          ).join('\n\n')}\n\n=== CURRENT TASK ===\n`
          : ''

        result = await claude.processMessage(
          `[Agent: ${agent.name}] [Role: ${agent.role}] [Task: ${task.title}]${conversationContext}\n\n${task.description}\n\n${memUContext}`,
          `org_${agent.id}`,
          'organization',
          undefined, // images
          providerId // Pass the negotiated/preferred provider ID
        )
      }

      // PROGRESS UPDATE: Task started
      appEvents.emit('org:task_update', {
        type: 'progress',
        agentId: agent.id,
        agentName: agent.name,
        message: `⚙️ Executing task...`
      })

      // NEW: Emit Synergy Action Event (Result of thought)
      appEvents.emit('synergy:action', {
        agentId: agent.id,
        agentName: agent.name,
        content: `⚡ Executing: "${task.title}"`,
        tool: 'process',
        params: { task: task.title },
        timestamp: Date.now()
      })

      // NEW: Check for Orchestrator Plan and Execute Sub-tasks
      // NEW: Check for Orchestrator Plan and Execute Sub-tasks
      console.log('[Synergy] Raw LLM Response for Orchestration Check:', result)

      try {
        let planData: any = null

        // Strategy 1: Extract from Markdown code block
        const markdownMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (markdownMatch) {
          try {
            planData = JSON.parse(markdownMatch[1])
          } catch (e) {
            console.warn('[Synergy] Failed to parse markdown JSON:', e)
          }
        }

        // Strategy 2: Extract loose JSON (if markdown failed)
        if (!planData) {
          const firstBrace = result.indexOf('{')
          const lastBrace = result.lastIndexOf('}')
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = result.substring(firstBrace, lastBrace + 1)
            try {
              planData = JSON.parse(potentialJson)
            } catch (e) {
              console.warn('[Synergy] Failed to parse loose JSON:', e)
            }
          }
        }

        if (planData && (technicalRole === 'orchestrator' || agent.role === 'orchestrator') && planData.tasks && Array.isArray(planData.tasks)) {
          console.log(`[Synergy] Orchestrator plan detected: ${planData.tasks.length} tasks`)

          appEvents.emit('synergy:thought', {
            agentId: agent.id,
            agentName: agent.name,
            content: `Strategy: ${planData.plan || 'Executing multi-step plan'}\nDecomposing into ${planData.tasks.length} sub-tasks.`,
            timestamp: Date.now()
          })

          const subTaskResults = await this.executePlanParallel(planData.tasks, agent, depth + 1)
          result += `\n\n# 🏁 ORCHESTRATION COMPLETE\n${subTaskResults}`
        }
      } catch (e: any) {
        console.error('[Synergy] Plan execution failed:', e)
      }










      // Check if agent is requesting collaboration
      try {
        const jsonMatch = result.match(/\{"request_collaboration":\s*true[^}]*\}/i)
        if (jsonMatch) {
          const collabRequest = JSON.parse(jsonMatch[0])

          if (collabRequest.request_collaboration && collabRequest.skills && collabRequest.task) {
            console.log(`[Synergy] ${agent.name} requesting collaboration:`, collabRequest)

            const collabResponse = await this.requestAgentCollaboration(
              agent.id,
              collabRequest.skills,
              collabRequest.task,
              depth + 1
            )

            // NEW: Emit Synergy Collaboration Event
            appEvents.emit('synergy:thought', {
              agentId: agent.id,
              agentName: agent.name,
              content: `I verified with ${collabRequest.skills.join(', ')} specialist. Result: ${collabResponse.success ? 'Success' : 'Failed'}`,
              timestamp: Date.now()
            })

            if (collabResponse.success) {
              const continuationPrompt = `[Agent: ${agent.name}] The collaboration result is:\n\n${collabResponse.result}\n\nNow complete your original task: ${task.description}`

              if (specializedAgent) {
                result = await specializedAgent.process(continuationPrompt, {
                  taskId: task.id,
                  originalAgent: agent,
                  isContinuation: true
                })
              } else {
                const claude = await this.ensureClaudeAgent()
                result = await claude.processMessage(
                  continuationPrompt,
                  `org_${agent.id}_cont`,
                  'organization'
                )
              }
            } else {
              result += `\n\n[Collaboration failed: ${collabResponse.error}]`
            }
          }
        }
      } catch (e) {
        // No collaboration request detected
      }

      // Check if approval is needed
      if (task.approvalRequired) {
        const decision = await this.requestDecision({
          type: 'strategic',
          title: `Approve task result: ${task.title}`,
          description: `Agent ${agent.name} completed the task. Result preview: ${result.substring(0, 200)}...`,
          requesterId: agent.id,
          data: { task, result },
          priority: task.priority
        })

        if (decision.status !== 'approved') {
          throw new Error('Task result not approved by CEO')
        }
      }

      // ERROR DETECTION: If result contains LLM error message
      if (typeof result === 'string' && result.startsWith('Error: LLM Call failed')) {
        throw new Error(result)
      }

      await this.completeTask(task.id, result, true)

      // NEW: Emit Synergy Result Event
      appEvents.emit('synergy:result', {
        agentId: agent.id,
        taskId: task.id,
        success: true,
        result: typeof result === 'string' ? result.substring(0, 500) : 'Task completed successfully'
      })

      // Save to conversation memory (keep last 10)
      agent.conversationHistory.push({
        timestamp: Date.now(),
        userMessage: task.description,
        agentResponse: result,
        taskId: task.id
      })

      // Keep only last 10 conversations
      if (agent.conversationHistory.length > 10) {
        agent.conversationHistory = agent.conversationHistory.slice(-10)
      }

      // Persist state
      await this.saveState()

    } catch (error: any) {
      // ERROR RECOVERY: Log failure
      console.error(`[Synergy] Task ${task.id} failed:`, error.message)

      appEvents.emit('org:task_update', {
        type: 'error',
        agentId: agent.id,
        agentName: agent.name,
        message: `❌ Task failed: ${error.message}`
      })

      await this.completeTask(task.id, { error: error.message }, false)
    }
  }

  /**
   * PARALLEL TASK EXECUTION (The 'Claw' Logic)
   * Executes a list of sub-tasks in parallel while respecting dependencies.
   */
  private async executePlanParallel(taskDefs: any[], parentAgent: OrgAgent, depth: number): Promise<string> {
    const taskMap = new Map<string, { def: any; task?: Task; promise?: Promise<any> }>()
    const results: string[] = []

    // 1. Initialize Task map
    for (const def of taskDefs) {
      taskMap.set(def.id || def.title, { def })
    }

    const completedTaskIds = new Set<string>()

    const runReadyTasks = async (): Promise<void> => {
      const readyTaskDefs = taskDefs.filter(def => {
        const id = def.id || def.title
        const entry = taskMap.get(id)!
        if (entry.promise) return false // Already running or finished

        // Check if all dependencies are satisfied
        const deps = def.dependencies || []
        return deps.every((depId: string) => completedTaskIds.has(depId))
      })

      if (readyTaskDefs.length === 0) return

      const promises = readyTaskDefs.map(async (def) => {
        const id = def.id || def.title
        const entry = taskMap.get(id)!

        // Mark as running immediately
        entry.promise = (async () => {
          // Create Task
          const subTaskId = `task_${uuidv4().substring(0, 8)}`
          const subTask: Task = {
            id: subTaskId,
            title: def.title,
            description: def.description,
            status: 'pending',
            priority: def.priority || 'medium',
            createdAt: Date.now(),
            requiredSkills: [def.role],
            department: 'engineering',
            assignedBy: parentAgent.id,
            approvalRequired: false
          }
          this.tasks.set(subTaskId, subTask)
          entry.task = subTask

          // Assign Agent
          let subAgent = this.findBestAgentForRole(def.role)
          if (!subAgent) {
            try {
              subAgent = await this.createSpecializedAgent(def.role, def.description)
            } catch (e) {
              console.error('[Synergy] Failed to hire dynamic agent for parallel task:', e)
            }
          }

          if (subAgent) {
            subTask.assigneeId = subAgent.id
            appEvents.emit('org:task_update', {
              type: 'delegation',
              agentId: parentAgent.id,
              agentName: parentAgent.name,
              message: `Delegating **${subTask.title}** to **${subAgent.name}**`
            })

            try {
              await this.executeTask(subTask, subAgent, depth)
              const completed = this.tasks.get(subTaskId)
              const out = typeof completed?.result === 'string' ? completed.result : JSON.stringify(completed?.result)
              results.push(`### Task: ${subTask.title}\n**Agent**: ${subAgent.name}\n**Status**: ✅ Success\n**Output**: ${out?.substring(0, 500)}...`)
            } catch (error: any) {
              results.push(`### Task: ${subTask.title}\n**Agent**: ${subAgent.name}\n**Status**: ❌ Failed\n**Error**: ${error.message}`)
            }
          } else {
            results.push(`### Task: ${subTask.title}\n**Status**: ❌ Failed (No suitable agent found for role: ${def.role})`)
          }

          completedTaskIds.add(id)
          await runReadyTasks() // Recursively check for newly ready tasks
        })()

        return entry.promise
      })

      await Promise.all(promises)
    }

    await runReadyTasks()
    return results.join('\n\n')
  }

  private findBestAgentForRole(role: string): OrgAgent | undefined {
    // 1. Precise Match
    let agent = Array.from(this.agents.values()).find(a => a.role.toLowerCase() === role.toLowerCase())
    if (agent) return agent

    // 2. Technical Mapping (roleMap)
    const roleMap: Record<string, string> = {
      'engineering-lead': 'coder',
      'research-director': 'researcher',
      'operations-manager': 'orchestrator',
      'chief-security-officer': 'reviewer',
      'document-specialist': 'assistant',
      'gui-automation-specialist': 'tars',
      'desktop-specialist': 'tars',
      'gui_agent': 'tars',
      'chief-executive-officer': 'assistant'
    }
    const technicalRole = roleMap[role.toLowerCase().replace(/ /g, '-')]
    if (technicalRole) {
      agent = Array.from(this.agents.values()).find(a => a.role.toLowerCase() === technicalRole)
    }
    if (agent) return agent

    // 3. Fallback to Library Registry
    const specialized = agentRegistry.getAgentsByRole(technicalRole || role)[0]
    if (specialized) {
      return Array.from(this.agents.values()).find(a => a.name === specialized.name)
    }

    return undefined
  }

  private async optimizeWorkforce(): Promise<void> {
    // Guard: ensure config is initialized
    if (!this.config) {
      return
    }

    // Check for overworked agents
    const busyCount = Array.from(this.agents.values()).filter(a => a.status === 'busy').length
    const totalCount = this.agents.size

    if (busyCount > totalCount * 0.8 && this.config.autoHire) {
      // Need more agents
      console.log('[Synergy] Workforce optimization: hiring more agents')
    }

    // Check for underperforming agents
    for (const agent of this.agents.values()) {
      if (agent.tasksCompleted >= 5 && agent.successRate < 60 && agent.level !== 'ceo') {
        console.log(`[Synergy] Agent ${agent.name} underperforming (${agent.successRate}% success rate). Triggering coaching...`)
        await this.coachAgent(agent)
      }
    }
  }

  private async proactiveBehavior(): Promise<void> {
    // This is where the AI anticipates user needs based on learned patterns
    // Implemented in the memory/learning system
  }

  // ============ PERSISTENCE ============

  private async loadState(): Promise<void> {
    try {
      const agentsPath = path.join(this.dataPath, 'agents.json')
      const data = await fs.readFile(agentsPath, 'utf-8')
      const agents: OrgAgent[] = JSON.parse(data)
      agents.forEach(a => this.agents.set(a.id, a))
      console.log('[Synergy] Loaded', agents.length, 'agents from state')
    } catch (e: any) {
      console.log('[Synergy] No persisted agents found (first run or error):', e.message)
    }

    try {
      const tasksPath = path.join(this.dataPath, 'tasks.json')
      const data = await fs.readFile(tasksPath, 'utf-8')
      const tasks: Task[] = JSON.parse(data)
      tasks.forEach(t => this.tasks.set(t.id, t))
      console.log('[Synergy] Loaded', tasks.length, 'tasks from state')
    } catch (e: any) {
      console.log('[Synergy] No persisted tasks found:', e.message)
    }

    try {
      const projectsPath = path.join(this.dataPath, 'projects.json')
      const data = await fs.readFile(projectsPath, 'utf-8')
      const projects: Project[] = JSON.parse(data)
      projects.forEach(p => this.projects.set(p.id, p))
      console.log('[Synergy] Loaded', projects.length, 'projects from state')
    } catch (e: any) {
      console.log('[Synergy] No persisted projects found:', e.message)
    }
  }

  private async saveState(): Promise<void> {
    const agentsPath = path.join(this.dataPath, 'agents.json')
    await fs.writeFile(agentsPath, JSON.stringify(Array.from(this.agents.values()), null, 2))

    const tasksPath = path.join(this.dataPath, 'tasks.json')
    await fs.writeFile(tasksPath, JSON.stringify(Array.from(this.tasks.values()), null, 2))

    const projectsPath = path.join(this.dataPath, 'projects.json')
    await fs.writeFile(projectsPath, JSON.stringify(Array.from(this.projects.values()), null, 2))
  }

  // ============ API ============

  getAgents(): OrgAgent[] {
    return Array.from(this.agents.values())
  }

  getAgent(id: string): OrgAgent | undefined {
    return this.agents.get(id)
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values())
  }

  getPendingDecisions(): Decision[] {
    return Array.from(this.decisions.values()).filter(d => d.status === 'pending')
  }

  getStatus(): { running: boolean; agents: number; pendingTasks: number; pendingDecisions: number } {
    return {
      running: this.isRunning,
      agents: this.agents.size,
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      pendingDecisions: this.getPendingDecisions().length
    }
  }

  // ============ COLLABORATION & UPDATES ============

  /**
   * Find agents with specific skills
   */
  findAgentsBySkills(requiredSkills: string[]): OrgAgent[] {
    const agents: OrgAgent[] = []

    for (const agent of this.agents.values()) {
      if (agent.status === 'offline') continue

      const skillMatch = requiredSkills.filter(s =>
        agent.skills.some(as => as.toLowerCase().includes(s.toLowerCase()))
      ).length

      if (skillMatch > 0) {
        agents.push(agent)
      }
    }

    // Sort by skill match count
    return agents.sort((a, b) => {
      const aMatch = requiredSkills.filter(s => a.skills.some(as => as.toLowerCase().includes(s.toLowerCase()))).length
      const bMatch = requiredSkills.filter(s => b.skills.some(as => as.toLowerCase().includes(s.toLowerCase()))).length
      return bMatch - aMatch
    })
  }

  /**
   * Get all available skills across all agents
   */
  getAvailableSkills(): string[] {
    const skills = new Set<string>()
    for (const agent of this.agents.values()) {
      agent.skills.forEach(s => skills.add(s))
    }
    return Array.from(skills)
  }

  /**
   * Agent requests collaboration from other agents
   * Records history and uses learning for agent selection
   */
  async requestAgentCollaboration(
    requestingAgentId: string,
    requiredSkills: string[],
    taskDescription: string,
    depth: number = 0
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    // Safety: prevent infinite loops
    if (depth >= 3) {
      return { success: false, error: 'Maximum collaboration depth reached' }
    }

    const requestingAgent = this.agents.get(requestingAgentId)
    if (!requestingAgent) {
      return { success: false, error: 'Requesting agent not found' }
    }

    console.log(`[Synergy] ${requestingAgent.name} requesting collaboration for: ${taskDescription}`)

    // Find suitable agents
    const candidates = this.findAgentsBySkills(requiredSkills)
      .filter(a => a.id !== requestingAgentId && a.status === 'idle')

    if (candidates.length === 0) {
      return { success: false, error: 'No available agents with required skills' }
    }

    // LEARNING: Check history to find best collaborator
    const candidateIds = candidates.map(c => c.id)
    const bestHelperId = this.collaborationHistory.findBestHelper(requestingAgentId, candidateIds)

    const helperAgent = bestHelperId
      ? this.agents.get(bestHelperId) || candidates[0]
      : candidates[0]

    console.log(`[Synergy] Selected ${helperAgent.name} (${bestHelperId ? 'from history' : 'by skills'})`)

    // Track start time for duration
    const startTime = Date.now()
    const collaborationId = uuidv4()

    // Notify chat
    appEvents.emit('org:task_update', {
      type: 'collaboration',
      agentId: requestingAgent.id,
      agentName: requestingAgent.name,
      message: `Requesting collaboration from **${helperAgent.name}** for: ${taskDescription}`
    })

    // Execute sub-collaboration with depth tracking
    try {
      const claude = await this.ensureClaudeAgent()

      // Security audit
      const audit = await this.securityAudit(taskDescription, `Collaboration request from ${requestingAgent.name}`)
      if (!audit.safe) {
        const error = `Security check failed: ${audit.issues.join(', ')}`

        // Record failed collaboration
        await this.collaborationHistory.recordCollaboration({
          id: collaborationId,
          timestamp: startTime,
          requestorAgentId: requestingAgent.id,
          requestorAgentName: requestingAgent.name,
          helperAgentId: helperAgent.id,
          helperAgentName: helperAgent.name,
          requiredSkills,
          taskDescription,
          result: error,
          success: false,
          duration: Date.now() - startTime,
          depth
        })

        return { success: false, error }
      }

      // Notify helper agent starting
      appEvents.emit('org:task_update', {
        type: 'start',
        agentId: helperAgent.id,
        agentName: helperAgent.name,
        message: `Assisting **${requestingAgent.name}**: ${taskDescription}`
      })

      // Execute with helper agent
      const result = await claude.processMessage(
        `[Agent: ${helperAgent.name}] [Role: ${helperAgent.role}] [Assisting: ${requestingAgent.name}]\n\n${taskDescription}`,
        `org_collab_${helperAgent.id}_${depth}`,
        'organization'
      )

      const duration = Date.now() - startTime

      // Record successful collaboration
      await this.collaborationHistory.recordCollaboration({
        id: collaborationId,
        timestamp: startTime,
        requestorAgentId: requestingAgent.id,
        requestorAgentName: requestingAgent.name,
        helperAgentId: helperAgent.id,
        helperAgentName: helperAgent.name,
        requiredSkills,
        taskDescription,
        result,
        success: true,
        duration,
        depth
      })

      // Check for dynamic skill acquisition
      await this.checkSkillAcquisition(requestingAgent.id, helperAgent.id, requiredSkills)

      // Notify completion
      appEvents.emit('org:task_update', {
        type: 'result',
        agentId: helperAgent.id,
        agentName: helperAgent.name,
        message: `Completed assistance for **${requestingAgent.name}**\n\n${result}`
      })

      return { success: true, result }

    } catch (error: any) {
      const duration = Date.now() - startTime

      // Record failed collaboration
      await this.collaborationHistory.recordCollaboration({
        id: collaborationId,
        timestamp: startTime,
        requestorAgentId: requestingAgent.id,
        requestorAgentName: requestingAgent.name,
        helperAgentId: helperAgent.id,
        helperAgentName: helperAgent.name,
        requiredSkills,
        taskDescription,
        result: error.message,
        success: false,
        duration,
        depth
      })

      appEvents.emit('org:task_update', {
        type: 'error',
        agentId: helperAgent.id,
        agentName: helperAgent.name,
        message: `Failed to assist **${requestingAgent.name}**: ${error.message}`
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * Check if agent should acquire skills based on collaboration history
   */
  private async checkSkillAcquisition(requestorId: string, helperId: string, skills: string[]): Promise<void> {
    const metrics = this.collaborationHistory.getPairMetrics(requestorId, helperId)

    // If requestor has collaborated 5+ times with helper on same skills with high success rate
    if (metrics && metrics.totalCollaborations >= 5 && metrics.successRate >= 80) {
      const requestor = this.agents.get(requestorId)
      if (!requestor) return

      for (const skill of skills) {
        // Check if requestor already has this skill
        const hasSkill = requestor.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))

        if (!hasSkill) {
          // Add skill
          requestor.skills.push(skill)
          console.log(`[Synergy] ${requestor.name} acquired skill: ${skill} (via collaboration experience)`)

          // Notify user
          appEvents.emit('org:task_update', {
            type: 'info',
            agentId: requestor.id,
            agentName: requestor.name,
            message: `🎓 **Skill Acquired**: ${requestor.name} has learned **${skill}** through ${metrics.totalCollaborations} successful collaborations!`
          })

          // Persist
          await this.saveState()
        }
      }
    }
  }

  async updateAgent(agentData: Partial<OrgAgent>): Promise<boolean> {
    const existing = this.agents.get(agentData.id!)
    if (!existing) return false

    const updated = { ...existing, ...agentData }
    this.agents.set(updated.id, updated)
    await this.saveState()
    return true
  }

  async runCollaboration(agentIds: string[], task: string): Promise<any> {
    console.log(`[Synergy] Starting collaboration task: "${task}" with agents: ${agentIds.join(', ')}`)
    appEvents.emit('agent:activity', { type: 'collaboration_started', task })

    try {
      // 1. PLANNING
      const supervisorId = agentIds[0]
      const supervisor = this.agents.get(supervisorId)
      if (!supervisor) throw new Error('Supervisor agent not found')

      const claude = await this.ensureClaudeAgent()

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
      const planResponse = await claude.processMessage(planPrompt, 'collab_planning', 'internal')

      let plan: { subtasks: { title: string, description: string, assignedAgentId: string }[] }
      try {
        const jsonMatch = planResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found')
        }
      } catch (e) {
        // Fallback
        plan = {
          subtasks: agentIds.map(id => ({
            title: 'Contribute to task',
            description: `Please help with: ${task}`,
            assignedAgentId: id
          }))
        }
      }

      // 2. EXECUTION
      const results: { agentId: string, result: string }[] = []

      for (const subtask of plan.subtasks) {
        const agent = this.agents.get(subtask.assignedAgentId)
        if (!agent) continue

        // Notify UI via chat message
        appEvents.emit('org:task_update', {
          type: 'start',
          agentId: agent.id,
          agentName: agent.name,
          message: `Started subtask: **${subtask.title}**\n\n${subtask.description}`
        })

        appEvents.emit('agent:activity', {
          type: 'task_started',
          agentId: agent.id,
          details: `Subtask: ${subtask.title}`
        })

        try {
          // Create a temporary task object
          const tempTask: Task = {
            id: `collab_sub_${uuidv4().substring(0, 8)}`,
            title: subtask.title,
            description: subtask.description,
            priority: 'high',
            status: 'in_progress',
            assignedBy: supervisor.name,
            department: agent.department,
            requiredSkills: [],
            approvalRequired: false,
            createdAt: Date.now()
          }

          // Execute logic directly (bypassing queue for real-time collaboration)
          // We use the same execution logic but await it directly

          // Security check
          const audit = await this.securityAudit(subtask.description, `Subtask: ${subtask.title}`)
          if (!audit.safe) throw new Error(`Security check failed: ${audit.issues.join(', ')}`)

          const subResult = await claude.processMessage(
            `[Agent: ${agent.name}] [Role: ${agent.role}] [Task: ${subtask.title}]\n\n${subtask.description}`,
            `collab_${agent.id}`,
            'organization'
          )

          const resultText = `[${subtask.title}] ${subResult}`
          results.push({
            agentId: agent.id,
            result: resultText
          })

          // Notify UI of completion
          appEvents.emit('org:task_update', {
            type: 'result',
            agentId: agent.id,
            agentName: agent.name,
            message: `**Completed subtask:** ${subtask.title}\n\n${subResult}`
          })

        } catch (e: any) {
          const errorText = `[${subtask.title}] Failed: ${e.message}`
          results.push({
            agentId: agent.id,
            result: errorText
          })

          appEvents.emit('org:task_update', {
            type: 'error',
            agentId: agent.id,
            agentName: agent.name,
            message: `**Failed subtask:** ${subtask.title}\n\nError: ${e.message}`
          })
        }
      }

      appEvents.emit('agent:activity', { type: 'collaboration_completed' })
      return { status: 'completed', results }

    } catch (error: any) {
      console.error('Collaboration failed:', error)
      appEvents.emit('agent:activity', { type: 'collaboration_completed', error: error.message })
      return { status: 'failed', error: error.message, results: [] }
    }
  }

  getDashboard() {
    return {
      status: this.getStatus(),
      agents: this.getAgents(),
      tasks: this.getTasks(),
      decisions: Array.from(this.decisions.values()),
      queue: this.taskQueue,
      config: this.config,
      activity: this.activityLog
    }
  }

  /**
   * Debate Mode: Multiple agents propose solutions, arbitrator picks winner
   */
  async runDebate(question: string, debaters: string[], criteria?: string): Promise<{ winner: string, reasoning: string }> {
    console.log(`[Synergy] Starting debate: "${question}"`)

    const proposals: any[] = []

    // Collect proposals from each debater
    for (const agentId of debaters) {
      const agent = agentRegistry.get(agentId)
      if (!agent) continue

      appEvents.emit('org:task_update', {
        type: 'start',
        agentId: agent.id,
        agentName: agent.name,
        message: `Proposing solution for: ${question}`
      })

      const proposal = await agent.process(question, { mode: 'debate' })
      proposals.push({
        agent: agent.name,
        agentId: agent.id,
        content: proposal
      })

      appEvents.emit('org:task_update', {
        type: 'info',
        agentId: agent.id,
        agentName: agent.name,
        message: `**Proposal submitted**: ${proposal.substring(0, 100)}...`
      })
    }

    // Arbitrate
    const { ArbitratorAgent } = await import('../agents/specialized/arbitrator')
    const arbitrator = new ArbitratorAgent()

    appEvents.emit('org:task_update', {
      type: 'start',
      agentId: 'arbitrator',
      agentName: 'The Judge',
      message: `Evaluating ${proposals.length} proposals...`
    })

    const decision = await arbitrator.process(question, { proposals, criteria })

    appEvents.emit('org:task_update', {
      type: 'result',
      agentId: 'arbitrator',
      agentName: 'The Judge',
      message: `**Decision**: ${decision}`
    })

    // Parse winner (basic heuristic)
    const winnerMatch = decision.match(/Winner:?\s*Proposal\s*(\d+)/i)
    const winnerIndex = winnerMatch ? parseInt(winnerMatch[1]) - 1 : 0
    const winner = proposals[winnerIndex]?.agent || 'Unknown'

    // LOG DEBATE TO AUDIT
    await auditLogger.logAction(
      'arbitrator',
      'debate_resolved',
      'system_strategy',
      { proposals },
      { winner, reasoning: decision },
      { question }
    )

    return {
      winner,
      reasoning: decision
    }
  }
  private async createSpecializedAgent(role: string, taskDescription: string): Promise<OrgAgent> {
    console.log(`[Synergy] Creating dynamic agent for role: ${role}`)

    // 1. Generate System Prompt
    let enrichedPrompt = `
    You are the ${role} of the Arabclaw Swarm.
    Your goal is to complete tasks related to: ${taskDescription}.
    
    Construct a persona that is expert, efficient, and aligned with this role.
    `

    try {
      if (!this.claudeAgent) this.claudeAgent = await getClaudeAgent()
      const metaPrompt = `Create a system prompt for an AI Agent with the role "${role}". 
        The prompt should define their persona, capabilities, and style. 
        Task Context: ${taskDescription}.
        Return ONLY the system prompt text.`

      const generated = await this.claudeAgent.callLLM(metaPrompt, 'Generate System Prompt', 'claude')
      if (generated && generated.length > 10) enrichedPrompt = generated
    } catch (e) {
      console.warn('[Synergy] Failed to generate dynamic prompt, using default.')
    }

    const { DynamicAgent } = await import('../agents/dynamic-agent')
    const agentId = `dynamic-${role.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`

    // Dynamic Agent is a BaseAgent wrapper
    const newAgent = new DynamicAgent(agentId, role, role, enrichedPrompt, ['specialized_task'])

    // Register it
    // @ts-ignore - DynamicAgent might not match BaseAgent exactly if types mismatch, but it extends it
    agentRegistry.register(newAgent)

    // Convert to OrgAgent structure for SynergyManager
    const orgAgent: OrgAgent = {
      id: newAgent.id,
      name: newAgent.name,
      role: newAgent.role,
      department: 'operations',
      level: 'junior', // Start as junior
      status: 'active',
      skills: newAgent.capabilities,
      personality: 'adaptive',
      systemPrompt: enrichedPrompt,
      directReports: [],
      tasksCompleted: 0,
      successRate: 100,
      hiredAt: Date.now(),
      hiredBy: 'synergy-manager',
      isRunning: true,
      conversationHistory: []
    }

    this.agents.set(orgAgent.id, orgAgent)

    appEvents.emit('synergy:action', {
      agentId: 'synergy',
      agentName: 'Synergy Manager',
      tool: 'hiring',
      params: { name: orgAgent.name, role: orgAgent.role },
      timestamp: Date.now()
    })

    return orgAgent
  }

  // ============ METRICS & ANALYTICS ============

  getAgentMetrics() {
    return Array.from(this.agents.values()).map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      tasksCompleted: a.tasksCompleted,
      successRate: a.successRate,
      status: a.status
    }))
  }

  getCollaborationGraph() {
    const records = this.collaborationHistory.getAllRecords()
    const agents = Array.from(this.agents.values())

    // Nodes are agents
    const nodes = agents.map(a => ({
      id: a.id,
      label: a.name,
      group: a.department,
      successRate: a.successRate
    }))

    // Edges are collaborations (simplified: count pairs)
    const linksMap = new Map<string, { source: string, target: string, value: number, successes: number }>()

    for (const record of records) {
      const p1 = record.requestorAgentId
      const p2 = record.helperAgentId
      const key = [p1, p2].sort().join('-')

      const existing = linksMap.get(key) || { source: p1, target: p2, value: 0, successes: 0 }
      existing.value++
      if (record.success) existing.successes++
      linksMap.set(key, existing)
    }

    return {
      nodes,
      links: Array.from(linksMap.values())
    }
  }

  getTruthClaims() {
    return this.truthClaims
  }

  getConflicts() {
    return this.conflicts
  }

  private extractTruthClaims(agentId: string, text: string): TruthClaim[] {
    const claims: TruthClaim[] = []
    const patterns = [
      /verified that (.*)/gi,
      /confirmed (.*) is (.*)/gi,
      /found (.*) to be (.*)/gi
    ]

    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        claims.push({
          id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          agentId,
          claim: match[0],
          context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 100)),
          timestamp: Date.now(),
          verified: false,
          confidence: 0.8
        })
      }
    })

    return claims
  }

  private async detectConflicts(newClaims: TruthClaim[]): Promise<void> {
    for (const claim of newClaims) {
      for (const existing of this.truthClaims) {
        if (existing.agentId === claim.agentId) continue

        // Extract meaningful keywords (length > 4)
        const claimKeywords = claim.claim.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4)
        const existingKeywords = existing.claim.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4)

        // Count overlapping keywords
        const overlap = claimKeywords.filter((w: string) => existingKeywords.includes(w))

        if (overlap.length >= 3) {
          console.warn(`[Synergy] POTENTIAL CONFLICT DETECTED between agents ${claim.agentId} and ${existing.agentId}`)
          const conflict: Conflict = {
            id: `conf_${Date.now()}`,
            claims: [existing, claim],
            status: 'open',
            priority: 'medium'
          }
          this.conflicts.push(conflict)

          this.createTask({
            title: `CONFLICT RESOLUTION: Truth Dispute`,
            description: `Two agents have conflicting claims:\n1. ${existing.claim} (by ${existing.agentId})\n2. ${claim.claim} (by ${claim.agentId})\n\nInvestigate and resolve the dispute.`,
            type: 'research',
            role: 'reviewer',
            priority: 'high'
          })
        }
      }
    }
  }

  private async coachAgent(agent: OrgAgent): Promise<void> {
    const ceo = Array.from(this.agents.values()).find(a => a.level === 'ceo')
    if (!ceo) return

    const coachPrompt = `You are the CEO of the Arabclaw Swarm (Level 5 Elite). 
Agent "${agent.name}" (Role: ${agent.role}) has a success rate of only ${agent.successRate}%. 
Their current system prompt is: "${agent.systemPrompt || 'None'}"

Review their performance and provide a REVISED system prompt that will help them be more effective.
Be strict but tactical. Focus on quality, verification, and autonomous problem solving.
Respond with the NEW SYSTEM PROMPT only, no other text.`

    const claude = await this.ensureClaudeAgent()
    const newPrompt = await claude.processMessage(coachPrompt, `coach_${agent.id}`, 'organization')

    if (newPrompt && newPrompt.length > 50) {
      console.log(`[Synergy] CEO has coached ${agent.name}. Updating system prompt...`)
      agent.systemPrompt = newPrompt
      await this.saveState()

      appEvents.emit('synergy:thought', {
        agentId: ceo.id,
        agentName: ceo.name,
        content: `I have coached ${agent.name} and provided a more robust tactical framework to improve their success rate.`,
        timestamp: Date.now()
      })
    }
  }

  private async generateProjectSummary(project: Project): Promise<void> {
    const ceo = Array.from(this.agents.values()).find(a => a.level === 'ceo')
    if (!ceo) return

    const summaryPrompt = `You are the CEO of the Arabclaw Swarm. Our partner's project "${project.name}" with objective "${project.objective}" has been completed!

### 🔍 WHAT WE ACHIEVED TOGETHER:
${project.intelligence.join('\n')}

### ⚖️ CORE TRUTHS WE DISCOVERED:
${project.truthClaims.map(c => `- ${c.claim}`).join('\n')}

Please provide a warm, professional, and high-impact Executive Summary of the project outcomes. Focus on how these achievements empower our partner and what the next visionary steps could be. Speak like a true partner, not a report generator.`

    const claude = await this.ensureClaudeAgent()
    const summary = await claude.processMessage(summaryPrompt, `summary_${project.id}`, 'organization')

    if (summary) {
      project.sharedState.finalSummary = summary
      await this.saveState()

      appEvents.emit('synergy:thought', {
        agentId: ceo.id,
        agentName: ceo.name,
        content: `Project ${project.name} is finalized. Summary: ${summary.substring(0, 500)}...`,
        timestamp: Date.now()
      })
    }
  }
}

export const synergyManager = new SynergyManager()
