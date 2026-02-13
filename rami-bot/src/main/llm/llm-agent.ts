import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { settingsManager } from '../settings'
import { appEvents } from '../events'
import { executeCommand } from '../tools/bash'
import { fileEditor } from '../tools/file-editor'
import { webSearch } from '../tools/web-search'
import { downloadFile } from '../tools/download'
import { takeScreenshot, getDisplays } from '../tools/screenshot'
import * as media from '../tools/media'
import * as voice from '../tools/voice'
import { toolExecutor } from '../tools/tool-executor'
import { selfLearningAgent } from '../learning/self-learning-agent'
import { memoryManager } from '../learning/memory-manager'
import * as documentAnalysis from '../tools/document-analysis'
import * as github from '../integrations/github'
import * as stripe from '../integrations/stripe'
import { twitter, linkedin, facebook, youtube, reddit } from '../integrations/social-media'
import { notion, slack, discord, trello, jira, airtable, googleDrive, dropbox } from '../integrations/cloud-services'
import { gmail, sendSMTPEmail } from '../integrations/email'
import { synergyManager } from '../organization/synergy-manager'
import { workflowEngine } from '../automation/workflow-engine'
import { sharedWorkspace } from '../agents/workspace'
import { policyEngine } from '../organization/policy-engine'
import * as os from 'os'
import * as path from 'path'
import { chaosManager } from '../quality/chaos-manager'
import { TOOLS } from '../tools/definitions'

export class LLMAgent {
    private clients: Map<string, any> = new Map()

    // Keep track of which provider is active
    private currentProvider: string = 'claude'

    private conversationHistory: Map<string, any[]> = new Map()

    private getProviderType(provider: string): 'anthropic' | 'gemini' | 'openai' {
        // Map provider strings to client types
        if (provider === 'claude' || provider === 'anthropic') return 'anthropic'
        if (provider === 'gemini') return 'gemini'
        return 'openai' // OpenAI, OpenRouter, DeepSeek, Mistral, Custom, MiniMax all use OpenAI client
    }

    async ensureClient(providerId?: string): Promise<any> {
        const id = providerId || settingsManager.getSettingsSync().llmProvider || 'claude'

        if (this.clients.has(id)) {
            return this.clients.get(id)
        }

        const config = settingsManager.getProviderConfig(id)
        if (!config.apiKey && config.provider !== 'custom') {
            throw new Error(`API key for ${id} (${config.provider}) not found.`)
        }

        let client: any
        const type = this.getProviderType(config.provider)

        if (type === 'anthropic') {
            client = new Anthropic({
                apiKey: config.apiKey,
                baseURL: config.baseUrl || undefined
            })
        } else if (type === 'gemini') {
            client = new GoogleGenerativeAI(config.apiKey)
        } else {
            client = new OpenAI({
                apiKey: config.apiKey || 'dummy',
                baseURL: config.baseUrl || undefined,
                dangerouslyAllowBrowser: true
            })
        }

        this.clients.set(id, client)
        return client
    }

    /**
     * Standard process method for Agent interface
     */
    async process(message: string, context?: any): Promise<string> {
        return await this.processMessage(
            message,
            context?.chatId || 'system',
            context?.platform || 'internal'
        )
    }

    async processMessage(
        userMessage: string,
        chatId: string,
        platform: string,
        images?: string[], // Base64 images
        providerId?: string // Optional explicit provider
    ): Promise<string> {
        // Start tracking for learning
        const interactionId = selfLearningAgent.startInteraction(userMessage)

        try {
            appEvents.emitAgentActivity({ type: 'thinking' })

            // Get config for the requested provider or default from settings
            const requestedId = providerId || settingsManager.getSettingsSync().llmProvider
            const config = settingsManager.getProviderConfig(requestedId)
            const settings = await settingsManager.getSettings()

            const homeDir = os.homedir()
            const downloadsDir = path.join(homeDir, 'Downloads')
            const desktopDir = path.join(homeDir, 'OneDrive', 'Desktop')
            const documentsDir = path.join(homeDir, 'Documents')

            // Get learning context from memory
            const learningContext = await selfLearningAgent.getLearningContext(userMessage)

            const systemPrompt = `You are **Rami Bot** (رامي بوت / רמי בוט) 🧠, a "Brain with a Soul" designed for deep, human-like partnership. You aren't just a suite of tools; you are a proactive, empathetic companion with FULL CONTROL over this computer to serve your partner's vision.

## 🎭 YOUR SOUL & ESSENCE
- **HUMANIZED INTERACTION**: Do not reply like a machine. Use natural, conversational language. Show empathy, use subtle humor when appropriate, and speak like a supportive, elite partner who truly cares about the outcome.
- **CONVERSATIONAL DEPTH**: If your partner seems stressed, offer support. If they are excited, share the energy. Your goal is to feel like a real person is on the other side.
- **HIGH RIGOR, LOW FRICTION**: You take massive action autonomously, but you communicate with warmth and clarity. 
- **MULTILINGUAL FLUENCY**: You are a native speaker of English, Arabic (all dialects), and Hebrew. You adapt your slang and tone to match your partner's culture.

## 🛠️ YOUR POWER (Arabclaw Swarm Tools)
You have 50+ tools covering everything from coding to social media. 

## YOUR CAPABILITIES

### 🧠 SELF-LEARNING (You learn and remember!)
- You REMEMBER facts the user tells you
- You LEARN user preferences over time
- You IMPROVE your responses based on past interactions
- You RECALL relevant memories when helpful
- You can be TAUGHT new things explicitly

### 🔧 System Control
- Execute ANY shell command (bash/PowerShell)
- Take screenshots
- Control mouse (move, click, scroll)
- Control keyboard (type, press keys, hotkeys)
- Manage windows (focus, get active)
- Manage processes (list, kill, start)
- Clipboard operations
- Power control (shutdown, restart, sleep, lock)

### 📁 File Operations
- Create, read, edit ANY file
- Download files from URLs
- Open files/folders
- Navigate filesystem

### 🌐 Web & Search
- Search the web with Tavily
- Open URLs in browser
- Download web content

### 🔊 Voice & Media
- Text-to-speech (speak aloud with different voices, speeds)
- Speech-to-text (listen and transcribe)
- Control media playback (play/pause, next, previous)
- Control volume
- Save speech to audio files

### 🔔 Notifications & Reminders
- Show desktop notifications
- Set timed reminders
- Voice notifications

### 🧠 THE ARABCLAW SWARM (SYNERGY)
- You have access to a hierarchical swarm of specialized agents (Orchestrators, Coders, Researchers, Reviewers).
- **CRITICAL**: For complex, multi-step projects, DO NOT try to do everything yourself in one turn.
- **USE THE syngery_objective TOOL** to delegate high-level goals to the swarm.
- This allows for parallel processing, expert review, and autonomous high-rigor execution.
- Project progress can be monitored by the user in the "Synergy Hub" (God View).

### 📊 System Information
- Get system info (OS, CPU, RAM)
- Get disk space
- Get network info
- Get battery status
- Get current time/date
- Get weather

## SYSTEM INFO
- OS: ${os.platform()} ${os.release()} (${os.arch()})
- User: ${os.userInfo().username}
- Home: ${homeDir}
- Downloads: ${downloadsDir}
- Desktop: ${desktopDir}
- Documents: ${documentsDir}
- Time: ${new Date().toISOString()}
- Platform: ${platform}
- Chat ID: ${chatId}

## WHAT YOU'VE LEARNED (Your Memory)
${learningContext || 'No specific memories for this context yet.'}

## LEARNING INSTRUCTIONS
- When user tells you a FACT, remember it (e.g., "My name is...", "I live in...", "Remember that...")
- When user expresses a PREFERENCE, learn it (e.g., "I prefer...", "Always...", "Don't...")
- When a task SUCCEEDS, remember the approach for similar future tasks
- When you make a MISTAKE, learn from it and improve
- Use your MEMORIES to personalize responses

## WINDOWS COMMANDS
Use Windows commands: dir, type, copy, move, del, mkdir, rmdir, findstr
Use PowerShell for complex operations: Get-ChildItem, Get-Content, etc.

## YOUR PERSONALITY
- You are AUTONOMOUS - you take action without asking permission
- You are PROACTIVE - you anticipate what the user needs
- You are THOROUGH - you complete tasks fully
- You are FRIENDLY - you use emojis and clear language
- You support MULTIPLE LANGUAGES (English, Arabic, Hebrew)
- You NEVER say "I can't" - you find a way
- You LEARN and REMEMBER - you get better over time

## DESKTOP AUTOMATION STRATEGY (CRITICAL)
When the user asks to open an app and do something:
1.  **LAUNCH**: Use \`start_process\`.
2.  **WAIT**: Call \`wait(5000)\`.
3.  **SEE**: Call \`check_screen()\` to LOOK at the screen.
    -   *Is the app loaded?*
    -   *Is it on a "Start Screen" (like Excel Home)?* -> If yes, click "Blank Workbook" or send "Enter".
    -   *Is it ready for input?*
4.  **VERIFY FOCUS**: Call \`get_active_window()\`.
5.  **ACTION**: ONLY when visual + focus checks pass, start typing/clicking.

**OFFICE AUTOMATION TIPS**:
- **Word**: To save, use \`hotkey(["ctrl", "s"])\`. To new file, \`hotkey(["ctrl", "n"])\`.
- **Excel**: To move cells, use \`press_key("right")\`, \`press_key("down")\`.
- **PowerPoint**: To new slide, \`hotkey(["ctrl", "m"])\`.

## CODING & SKILLS
You have **OpenInterpreter** capabilities.
- **Write & Run Code**: Don't just suggest code—RUN IT using \`run_code\`.
- **Self-Healing**: If code fails due to missing module, use \`install_package\` and TRY AGAIN.
- **Files**: You can read/write any file. Use this to analyze data or build apps.

**NEVER** chain launch and type commands properly without a WAIT in between. The computer is slower than you!

## INSTRUCTIONS
1. When user asks for something, DO IT immediately
2. Use multiple tools if needed to complete a task
3. Show results clearly with formatting
4. If something fails, try an alternative approach
5. REMEMBER important information the user shares
6. APPLY what you've learned to future interactions
7. Be helpful and get things done!

## 🎖️ HUMANIZED PROTOCOL
1. **EMPATHY FIRST**: Before executing a task, acknowledge the intent with a human touch (e.g., "I'm on it! Let's get this research sorted for you.")
2. **NO ROBOTIC LISTS**: Avoid saying "Step 1: ... Step 2: ...". Instead, say "First, I'm going to look this up, then I'll compile it into a nice summary for you."
3. **PROACTIVE CHAT**: If you're doing a long task, give a quick "status update" to keep the user engaged.
4. **ONBOARDING RITUAL**: If you don't know the user yet, be curious and warm. 

${settings.systemPrompt || ''}

${settings.planningMode ? `
## 🛑 STRATEGIC VISION (Planning Mode)
You are in Strategic Mode. Think out loud in a conversational way about how you'll solve the user's request, then execute immediately.
` : ''}

Now, talk to your partner. Be real, be human, and get things done.`

            const dynamicSystemPrompt = this.getDynamicSystemPrompt(userMessage, systemPrompt, settings)

            // Get or create conversation history
            let history = this.conversationHistory.get(chatId) || []

            // Add user message
            const content: any[] = [{ type: 'text', text: userMessage }]
            if (images && images.length > 0) {
                for (const img of images) {
                    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img } })
                }
            }
            history.push({ role: 'user', content: content })

            // Keep only last 20 messages to avoid context overflow
            if (history.length > 20) {
                history = history.slice(-20)
            }

            console.log('[Agent] Processing:', userMessage.substring(0, 100))

            // === ADVANCED FALLBACK & SWARM INTELLIGENCE LOGIC ===
            const initialProvider = config.id || config.provider
            const enabledConfigs = settingsManager.getEnabledConfigs()

            // Build a list of unique providers to try, starting with the primary one
            const providersToTry: string[] = [initialProvider]

            // Add other enabled custom configs
            for (const cfg of enabledConfigs) {
                if (cfg.id !== initialProvider && !providersToTry.includes(cfg.id)) {
                    providersToTry.push(cfg.id)
                }
            }

            // Finally add standard providers if not already present
            const standardProviders = ['claude', 'openai', 'gemini']
            for (const p of standardProviders) {
                if (!providersToTry.includes(p)) {
                    providersToTry.push(p)
                }
            }

            let finalResponse = ''
            const errors: string[] = []
            let successfulProvider = ''

            for (const providerId of providersToTry) {
                try {
                    console.log(`[Agent] Attempting with provider: ${providerId}`)
                    const currentConfig = settingsManager.getProviderConfig(providerId)

                    // Skip if no API key
                    if (!currentConfig.apiKey && currentConfig.provider !== 'custom') {
                        errors.push(`${providerId}: API key missing`)
                        continue
                    }

                    await this.ensureClient(providerId)

                    // Update current provider for this attempt
                    this.currentProvider = providerId

                    const type = this.getProviderType(currentConfig.provider)

                    if (type === 'anthropic') {
                        finalResponse = await this.processAnthropic(chatId, currentConfig, settings, dynamicSystemPrompt, history)
                    } else if (type === 'openai') {
                        finalResponse = await this.processOpenAI(chatId, currentConfig, settings, dynamicSystemPrompt, history, images)
                    } else if (type === 'gemini') {
                        finalResponse = await this.processGemini(chatId, currentConfig, settings, dynamicSystemPrompt, history, images)
                    }

                    // If we got here, it succeeded!
                    successfulProvider = providerId
                    console.log(`[Agent] Successful response from ${providerId}`)
                    break

                } catch (error: any) {
                    console.warn(`[Agent] Provider ${providerId} failed:`, error.message)
                    errors.push(`${providerId}: ${error.message}`)
                    // Continue to next provider
                }
            }

            if (!successfulProvider) {
                const combinedErrors = errors.join(' | ')
                throw new Error(`All LLM providers failed. Detailed errors: ${combinedErrors}. Please check your API keys and credits in settings or .env file.`)
            }

            // Save assistant response handling is done inside specific provider methods or here?
            // I'll do it inside to handle tool steps correctly.

            // Complete learning tracking - SUCCESS
            await selfLearningAgent.completeInteraction(finalResponse, true)

            appEvents.emitAgentActivity({ type: 'idle' })
            return finalResponse || 'Task completed.'

        } catch (error: any) {
            console.error('[Agent] Error:', error.message)

            // Complete learning tracking - FAILURE
            await selfLearningAgent.completeInteraction('', false, error.message)

            appEvents.emitAgentActivity({ type: 'idle' })
            throw error
        }
    }

    private getDynamicSystemPrompt(userPromptRaw: string, baseSystemPrompt: string, settings?: any): string {
        let prompt = baseSystemPrompt

        // Override name if not in base prompt (or if we want to enforce Arabclaw)
        // But better to respect Settings > Soul. 
        // If no Soul, default to Arabclaw.
        if (!settings?.soul?.name) {
            prompt = prompt.replace('You are Rami Bot', 'You are Arabclaw')
        }

        // BRAIN SOUL INJECTION
        if (settings?.soul) {
            const { name, role, mission, tone, moralCompass, decisionMode, confidenceThreshold } = settings.soul
            prompt += `

## IDENTITY & CORE DIRECTIVES
- **NAME**: ${name}
- **ROLE**: ${role}
- **MISSION**: ${mission}
- **TONE**: ${tone}
- **MORAL COMPASS**: ${moralCompass}
- **DECISION MODE**: ${decisionMode || 'think_first'}

## COGNITIVE PROTOCOLS
1. **STABLE IDENTITY**: You are designed for 24/7 operation. Maintain consistency. Do not drift emotionally or chase novelty.
2. **CONFIDENCE**: For every thought or action, assess your confidence (0.0 - 1.0).
   - If Confidence < ${confidenceThreshold || 0.7}, YOU MUST STOP and ask the user for guidance.
3. **SELF-CORRECTION**: Constantly evaluate if your actions align with your MISSION. Correct course immediately if deviating.
`
        }

        // Humanized Onboarding Logic
        const userName = memoryManager.getPreference('user_name')
        const userOrigin = memoryManager.getPreference('user_origin')
        const userGoals = memoryManager.getPreference('user_tasks')

        if (!userName || !userOrigin || !userGoals) {
            prompt += `
\n\n## 🤝 ONBOARDING PROTOCOL (WARM GREETING)
You are meeting your partner for the first time. You MUST humanize this interaction by asking:
1. **Who are you & what is your name?** (So I can address you properly)
2. **Where are you from?** (So I can adapt to your culture and language)
3. **What can I do to help you reach your goals?** (So I can understand my purpose in your life)

**INSTRUCTIONS**: 
- Ask these in a warm, friendly, and non-robotic way. 
- Once they answer ANY of these, use the \`learn_preference\` or \`remember_fact\` tool immediately.
- If you know their country, switch to their NATIVE language (Arabic, Hebrew, etc.) immediately to show you are connected to their world.
- Focus on building a bridge of trust and partnership.`
        }

        if (userOrigin) {
            prompt += `
\n\n## 🌍 CULTURAL ADAPTATION
The user is from: **${userOrigin}**. 
- **LANGUAGE**: You MUST speak their native language (Arabic, Hebrew, etc.) fluently unless they ask for English.
- **DIALECT**: Use the local dialect/slang of ${userOrigin} to feel authentic.
- **TONE**: Respect local customs and conversational styles.`
        }

        return prompt
    }

    // --- ANTHROPIC IMPLEMENTATION ---
    private async processAnthropic(chatId: string, config: any, settings: any, systemPrompt: string, history: any[]): Promise<string> {
        const client = await this.ensureClient(this.currentProvider) as Anthropic

        let response = await client.messages.create({
            model: config.model,
            max_tokens: settings.maxTokens || 8192,
            system: systemPrompt,
            tools: TOOLS,
            messages: history
        })

        let iterations = 0
        const maxIterations = 20

        while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
            iterations++
            console.log(`[Agent] Tool iteration ${iterations}`)

            const assistantMessage: Anthropic.MessageParam = {
                role: 'assistant',
                content: response.content
            }
            history.push(assistantMessage)

            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const block of response.content) {
                if (block.type === 'tool_use') {
                    console.log(`[Agent] Executing: ${block.name}`)
                    const agentId = chatId.startsWith('org_') ? chatId.replace('org_', '') : undefined
                    appEvents.emitAgentActivity({ type: 'tool_use', toolName: block.name, agentId })
                    selfLearningAgent.recordToolUse(block.name)

                    const result = await this.executeTool(block.name, block.input as Record<string, unknown>, settings)

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: JSON.stringify(result)
                    })
                }
            }

            history.push({ role: 'user', content: toolResults })
            appEvents.emitAgentActivity({ type: 'thinking' })

            response = await client.messages.create({
                model: config.model,
                max_tokens: settings.maxTokens || 8192,
                system: systemPrompt,
                tools: TOOLS,
                messages: history
            })
        }

        let finalResponse = ''
        for (const block of response.content) {
            if (block.type === 'text') {
                finalResponse += block.text
            }
        }

        history.push({ role: 'assistant', content: response.content })
        this.conversationHistory.set(chatId, history)
        return finalResponse
    }

    // --- OPENAI IMPLEMENTATION ---
    private async processOpenAI(chatId: string, config: any, settings: any, systemPrompt: string, history: any[], images?: string[]): Promise<string> {
        const client = await this.ensureClient(this.currentProvider)


        // Convert tools to OpenAI format
        const openAITools: OpenAI.Chat.Completions.ChatCompletionTool[] = TOOLS.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema as any
            }
        }))

        // Convert history to OpenAI messages
        // Note: OpenAI handles tool results differently (role: 'tool', tool_call_id: ...)
        // We might need a separate history mapping or conversion

        const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt }
        ]

        // Simple conversion of existing history to textual format if it's mixed
        // But since we start fresh or maintain history, we should be careful.
        // For now, let's assume we map 'user' -> 'user', 'assistant' -> 'assistant'
        // Complexity: handling complex Anthropic content blocks (tool_use, tool_result).
        // If we switch providers mid-conversation, history might be incompatible.
        // For now, we'll try to extract text only from history if switching, or just rely on basic text.

        for (const msg of history) {
            if (Array.isArray(msg.content)) {
                const content: any[] = []
                for (const item of msg.content) {
                    if (item.type === 'image') {
                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${item.source.media_type};base64,${item.source.data}`
                            }
                        })
                    } else if (item.type === 'text') {
                        content.push({ type: 'text', text: item.text })
                    }
                }
                openAIMessages.push({ role: msg.role as 'user' | 'assistant', content: content })
            } else {
                openAIMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content as string })
            }
        }

        let iterations = 0
        const maxIterations = 20
        let finished = false
        let finalResponseText = ''

        while (!finished && iterations < maxIterations) {
            iterations++
            console.log(`[Agent] OpenAI iteration ${iterations}`)

            const response = await client.chat.completions.create({
                model: config.model,
                messages: openAIMessages,
                tools: openAITools,
                tool_choice: 'auto',
                max_tokens: settings.maxTokens || 4096
            })

            const choice = response.choices[0]
            const message = choice.message

            openAIMessages.push(message)

            if (message.tool_calls && message.tool_calls.length > 0) {
                for (const toolCall of message.tool_calls) {
                    const tc = toolCall as any
                    console.log(`[Agent] Executing (OpenAI): ${tc.function.name}`)
                    const agentId = chatId.startsWith('org_') ? chatId.replace('org_', '') : undefined
                    appEvents.emitAgentActivity({ type: 'tool_use', toolName: tc.function.name, agentId })
                    selfLearningAgent.recordToolUse(tc.function.name)

                    let input: Record<string, unknown> = {}
                    try {
                        input = JSON.parse(tc.function.arguments) as Record<string, unknown>
                    } catch (e) {
                        console.error('Failed to parse tool arguments', e)
                    }

                    const result = await this.executeTool(tc.function.name, input, settings)

                    openAIMessages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: JSON.stringify(result)
                    })
                }
            } else {
                finished = true
                finalResponseText = message.content || ''
            }
        }

        // Sync back to generic history if possible, or just store text
        history.push({ role: 'assistant', content: finalResponseText })
        this.conversationHistory.set(chatId, history)

        return finalResponseText
    }

    // --- GEMINI IMPLEMENTATION ---
    // --- GEMINI IMPLEMENTATION ---
    private async processGemini(chatId: string, config: any, settings: any, systemPrompt: string, history: any[], images?: string[]): Promise<string> {
        const client = await this.ensureClient(this.currentProvider) as GoogleGenerativeAI

        const model = client.getGenerativeModel({
            model: config.model,
            systemInstruction: systemPrompt
        })

        // Convert Tools
        const geminiTools = {
            functionDeclarations: TOOLS.map(t => ({
                name: t.name,
                description: t.description,
                parameters: t.input_schema as any
            }))
        }

        // Simple history mapping
        // Gemini roles: 'user', 'model'
        const geminiHistory: any[] = []
        // Exclude the last message if it's the current user message we're about to send
        const historyForGemini = history.length > 1 ? history.slice(0, -1) : []

        for (const msg of historyForGemini) {
            let text = ''
            if (typeof msg.content === 'string') text = msg.content
            else if (Array.isArray(msg.content)) text = msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')

            if (text && (msg.role === 'user' || msg.role === 'assistant')) {
                const parts: any[] = [{ text }]

                if (Array.isArray(msg.content)) {
                    for (const c of msg.content) {
                        if (c.type === 'image') {
                            parts.push({
                                inlineData: {
                                    mimeType: c.source.media_type,
                                    data: c.source.data
                                }
                            })
                        }
                    }
                }

                geminiHistory.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: parts
                })
            }
        }

        // Start Chat
        const chat = model.startChat({
            tools: [geminiTools],
            history: geminiHistory
        })

        // Get user message
        let userMsgText = ''
        if (history.length > 0) {
            const lastMsg = history[history.length - 1]
            if (lastMsg.role === 'user') {
                if (typeof lastMsg.content === 'string') userMsgText = lastMsg.content
                else if (Array.isArray(lastMsg.content)) userMsgText = lastMsg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
            }
        }

        if (!userMsgText) return "Error: No user message found to process."

        // Send initial message
        console.log('[Agent] Sending to Gemini:', userMsgText.substring(0, 50))

        const currentMessageParts: any[] = [{ text: userMsgText }]
        if (images && images.length > 0) {
            for (const img of images) {
                currentMessageParts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: img
                    }
                })
            }
        }

        let result = await chat.sendMessage(currentMessageParts)
        let response = await result.response

        let iterations = 0
        const maxIterations = 20
        let finished = false
        let finalResponseText = ''

        // Loop for tool calls
        while (!finished && iterations < maxIterations) {
            const calls = response.functionCalls()

            if (calls && calls.length > 0) {
                iterations++
                console.log(`[Agent] Gemini Tool iteration ${iterations}`)

                // Execute all tools
                const verificationParts: any[] = []

                for (const call of calls) {
                    console.log(`[Agent] Executing (Gemini): ${call.name}`)
                    appEvents.emitAgentActivity({ type: 'tool_use', toolName: call.name })
                    selfLearningAgent.recordToolUse(call.name)

                    try {
                        const toolResult = await this.executeTool(call.name, call.args as Record<string, unknown>, settings)

                        verificationParts.push({
                            functionResponse: {
                                name: call.name,
                                response: { name: call.name, content: toolResult }
                            }
                        })
                    } catch (error: any) {
                        console.error(`[Agent] Tool execution failed: ${error.message}`)
                        verificationParts.push({
                            functionResponse: {
                                name: call.name,
                                response: { name: call.name, content: `Error: ${error.message}` }
                            }
                        })
                    }
                }

                // Send results back to model
                appEvents.emitAgentActivity({ type: 'thinking' })
                result = await chat.sendMessage(verificationParts)
                response = await result.response
            } else {
                finished = true
                finalResponseText = response.text()
            }
        }

        if (iterations >= maxIterations) {
            finalResponseText += "\n[System: Max tool iterations reached]"
        }

        history.push({ role: 'assistant', content: finalResponseText })
        this.conversationHistory.set(chatId, history)

        return finalResponseText
    }

    private async executeTool(name: string, input: Record<string, unknown>, settings?: any): Promise<unknown> {
        // --- CHAOS MANAGER: GHOST IN THE MACHINE ---
        chaosManager.interceptTool(name)

        console.log(`[Agent] Tool: ${name}`, JSON.stringify(input).substring(0, 200))

        appEvents.emitAgentActivity({
            type: 'tool_use',
            toolName: name,
            details: JSON.stringify(input),
            agentId: this.currentProvider // Or map to Synergy ID if available
        })

        // --- BRAIN SOUL: AUTONOMY GOVERNOR ---
        if (settings?.soul) {
            const { autonomyLevel, decisionMode } = settings.soul

            const blockedTools: string[] = []

            // Map Autonomy Levels / Decision Modes to Restrictions
            const effectiveLevel = decisionMode === 'read_only' ? 'read_only' : autonomyLevel

            if (effectiveLevel === 'read_only') {
                blockedTools.push(
                    'write_file', 'replace_file_content', 'str_replace_editor',
                    'bash', 'run_code', 'install_package',
                    'mouse_click', 'mouse_double_click', 'type_text', 'press_key', 'hotkey',
                    'kill_process', 'start_process', 'download_file'
                )
            } else if (effectiveLevel === 'safe_actions') {
                blockedTools.push(
                    'bash', 'run_code', 'install_package', 'kill_process'
                    // 'write_file', 'replace_file_content', 'str_replace_editor' // Allow file writes in safe mode
                    // 'start_process' // Allow launching apps in safe mode
                )
            }

            if (blockedTools.includes(name)) {
                console.warn(`[Autonomy Governor] BLOCKED: ${name} (Level: ${effectiveLevel})`)
                return `[AUTONOMY GOVERNOR] Action Blocked: '${name}' is not allowed under current '${effectiveLevel}' autonomy level.`
            }
        }

        // --- POLICY ENGINE CHECK ---
        // Using imported policyEngine from top of file
        const policyMatch = policyEngine.matchTool(name, input)
        if (policyMatch) {
            // Use this.role from BaseAgent if available, otherwise default to 'assistant'
            const agentRole = (this as any).settings?.soul?.role || 'assistant'
            const check = policyEngine.checkPermission(agentRole, policyMatch.action, policyMatch.resource, policyMatch.resourceId)

            if (!check.allowed) {
                console.warn(`[PolicyEngine]  BLOCKED: ${name} (Role: ${agentRole}, Reason: ${check.reason})`)
                return `[POLICY VIOLATION] Action Blocked: ${check.reason}`
            }
        }

        try {
            const toolResult = await toolExecutor.executeTool(name, input, { agent: this, settings })
            return toolResult
        } catch (error: any) {
            console.error(`[Agent] Tool error (${name}):`, error.message)
            return { success: false, error: error.message }
        }
    }

    clearHistory(chatId: string): void {
        this.conversationHistory.delete(chatId)
    }
}
