import { Agent, AgentRole, AgentMessage } from './types'
import { app } from 'electron'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { settingsManager } from '../settings'
import { toolExecutor } from '../tools/tool-executor'
import { TOOLS } from '../tools/definitions'
import { appEvents } from '../events'

export abstract class BaseAgent implements Agent {
    id: string
    name: string
    role: AgentRole
    capabilities: string[]

    protected openai: OpenAI | null = null
    protected anthropic: Anthropic | null = null
    protected genAI: GoogleGenerativeAI | null = null

    constructor(id: string, name: string, role: AgentRole, capabilities: string[]) {
        this.id = id
        this.name = name
        this.role = role
        this.capabilities = capabilities
        this.initializeLLM()
    }

    protected async initializeLLM() {
        const settings = settingsManager.getSettingsSync()

        if (settings.openaiApiKey) {
            this.openai = new OpenAI({ apiKey: settings.openaiApiKey, baseURL: settings.openaiBaseUrl })
        }
        if (settings.claudeApiKey) {
            this.anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
        }
        if (settings.googleGeminiApiKey) {
            this.genAI = new GoogleGenerativeAI(settings.googleGeminiApiKey)
        }
    }

    abstract process(message: string, context?: any): Promise<string>

    protected async callLLM(
        systemPrompt: string,
        userMessage: string,
        provider?: string,
        includeTools: boolean = true,
        images?: any[]
    ): Promise<string> {
        const settings = settingsManager.getSettingsSync()
        const targetProvider = provider || settings.llmProvider

        try {
            return await this.executeLLMCall(targetProvider, systemPrompt, userMessage, includeTools, images)
        } catch (error: any) {
            console.error(`[BaseAgent] Primary provider ${targetProvider} failed:`, error.message)

            // Fallback Logic
            if (settings.fallbackProvider && settings.fallbackProvider !== targetProvider) {
                console.log(`[BaseAgent] Attempting fallback to ${settings.fallbackProvider}...`)
                try {
                    return await this.executeLLMCall(settings.fallbackProvider, systemPrompt, userMessage, includeTools, images)
                } catch (fallbackError: any) {
                    console.error(`[BaseAgent] Fallback provider ${settings.fallbackProvider} also failed:`, fallbackError.message)
                }
            }

            return `Error: LLM Call failed. ${error.message}`
        }
    }

    private async executeLLMCall(provider: string, systemPrompt: string, userMessage: string, includeTools: boolean, images?: any[]): Promise<string> {
        const settings = settingsManager.getSettingsSync()
        const providerConfig = settingsManager.getProviderConfig(provider)
        appEvents.emitAgentActivity({ type: 'thinking', agentId: this.id, details: `Agent ${this.name} is strategizing via ${provider}...` })

        // 1. ANTHROPIC / COMPATIBLE (Claude, MiniMax, NanoBanna)
        if (providerConfig.provider === 'claude' || providerConfig.provider === 'minimax' || providerConfig.provider === 'nanobanna') {
            const client = new Anthropic({
                apiKey: providerConfig.apiKey,
                baseURL: providerConfig.baseUrl || undefined
            })

            let userContent: any[] = [{ type: 'text', text: userMessage }]
            if (images && images.length > 0) {
                for (const img of images) {
                    userContent.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/png',
                            data: img.type === 'image_url' ? img.image_url.url.split(',')[1] : img
                        }
                    })
                }
            }

            let messages: any[] = [{ role: 'user', content: userContent }]

            let response = await client.messages.create({
                model: providerConfig.model,
                max_tokens: settings.maxTokens || 4096,
                system: systemPrompt,
                tools: includeTools ? TOOLS : undefined,
                messages: messages
            })

            let iterations = 0
            const maxIterations = 10

            while (response.stop_reason === 'tool_use' && iterations < maxIterations && includeTools) {
                iterations++
                messages.push({ role: 'assistant', content: response.content })

                const toolResults: any[] = []
                for (const block of response.content) {
                    if (block.type === 'tool_use') {
                        appEvents.emitAgentActivity({
                            type: 'tool_use',
                            toolName: block.name,
                            agentId: this.id,
                            details: JSON.stringify(block.input)
                        })
                        const result = await toolExecutor.executeTool(block.name, block.input as Record<string, any>)

                        let toolContent: any = JSON.stringify(result)
                        if (typeof result === 'object' && (result as any).success && (result as any).data && typeof (result as any).data === 'string' && (result as any).data.length > 1000) {
                            toolContent = [
                                { type: 'text', text: 'Visual state updated. See attached image.' },
                                {
                                    type: 'image',
                                    source: {
                                        type: 'base64',
                                        media_type: 'image/png',
                                        data: (result as any).data
                                    }
                                }
                            ]
                        }

                        toolResults.push({
                            type: 'tool_result',
                            tool_use_id: block.id,
                            content: toolContent
                        })
                    }
                }

                messages.push({ role: 'user', content: toolResults })
                response = await client.messages.create({
                    model: providerConfig.model,
                    max_tokens: settings.maxTokens || 4096,
                    system: systemPrompt,
                    tools: TOOLS,
                    messages: messages
                })
            }

            return response.content
                .filter(b => b.type === 'text')
                .map(b => (b as any).text)
                .join('\n')
        }

        // 2. OPENAI / COMPATIBLE (OpenAI, OpenRouter, DeepSeek, Mistral, Custom)
        if (providerConfig.provider === 'openai' || providerConfig.provider === 'openrouter' || providerConfig.provider === 'deepseek' || providerConfig.provider === 'mistral' || providerConfig.provider === 'custom') {
            const client = new OpenAI({
                apiKey: providerConfig.apiKey,
                baseURL: providerConfig.baseUrl || undefined
            })

            let userContent: any[] = [{ type: 'text', text: userMessage }]
            if (images && images.length > 0) {
                for (const img of images) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: img.type === 'image_url' ? img.image_url.url : `data:image/png;base64,${img}`
                        }
                    })
                }
            }

            let messages: any[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ];

            const openAITools = includeTools ? TOOLS.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.input_schema
                }
            })) : undefined;

            let response = await client.chat.completions.create({
                model: providerConfig.model,
                messages: messages as any,
                tools: openAITools as any
            })

            let iterations = 0
            while (response.choices[0].message.tool_calls && iterations < 10 && includeTools) {
                iterations++
                const assistantMessage = response.choices[0].message
                messages.push(assistantMessage)

                for (const toolCall of assistantMessage.tool_calls!) {
                    appEvents.emitAgentActivity({
                        type: 'tool_use',
                        toolName: toolCall.function.name,
                        agentId: this.id,
                        details: toolCall.function.arguments
                    })
                    const result = await toolExecutor.executeTool(
                        toolCall.function.name,
                        JSON.parse(toolCall.function.arguments)
                    )

                    let toolContent: any = JSON.stringify(result)
                    if (typeof result === 'object' && (result as any).success && (result as any).data && typeof (result as any).data === 'string' && (result as any).data.length > 1000) {
                        toolContent = [
                            { type: 'text', text: 'Visual state updated.' },
                            {
                                type: 'image_url',
                                image_url: { url: `data:image/png;base64,${(result as any).data}` }
                            }
                        ]
                    }

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: toolContent
                    })
                }

                response = await client.chat.completions.create({
                    model: providerConfig.model,
                    messages: messages as any,
                    tools: openAITools as any
                })
            }

            return response.choices[0]?.message?.content || ''
        }

        // 3. GOOGLE GEMINI
        if (providerConfig.provider === 'gemini') {
            const model = this.genAI!.getGenerativeModel({
                model: providerConfig.model,
                systemInstruction: systemPrompt
            })

            const geminiTools = includeTools ? {
                functionDeclarations: TOOLS.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.input_schema as any
                }))
            } : undefined

            const chat = model.startChat({
                tools: geminiTools ? [geminiTools] : undefined
            })

            const currentMessageParts: any[] = [{ text: userMessage }]
            if (images && images.length > 0) {
                for (const img of images) {
                    currentMessageParts.push({
                        inlineData: {
                            mimeType: 'image/png',
                            data: img.type === 'image_url' ? img.image_url.url.split(',')[1] : img
                        }
                    })
                }
            }

            let result = await chat.sendMessage(currentMessageParts)
            let response = await result.response

            let iterations = 0
            const maxIterations = 10

            while (iterations < maxIterations && includeTools) {
                const calls = response.functionCalls()
                if (!calls || calls.length === 0) break

                iterations++
                const verificationParts: any[] = []

                for (const call of calls) {
                    appEvents.emitAgentActivity({
                        type: 'tool_use',
                        toolName: call.name,
                        agentId: this.id,
                        details: JSON.stringify(call.args)
                    })
                    const toolResult: any = await toolExecutor.executeTool(call.name, call.args as Record<string, any>)

                    if (typeof toolResult === 'object' && toolResult.success && toolResult.data && typeof toolResult.data === 'string' && toolResult.data.length > 1000) {
                        verificationParts.push({
                            functionResponse: {
                                name: call.name,
                                response: { content: 'Visual state updated. See image.' }
                            }
                        })
                        verificationParts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: toolResult.data
                            }
                        })
                    } else {
                        verificationParts.push({
                            functionResponse: {
                                name: call.name,
                                response: { content: toolResult }
                            }
                        })
                    }
                }

                result = await chat.sendMessage(verificationParts)
                response = await result.response
            }

            return response.text()
        }

        throw new Error(`Provider ${provider} not configured or supported in executeLLMCall.`)
    }
}
