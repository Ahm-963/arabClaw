import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fsSync from 'fs'

// Load .env file if it exists (allows users to configure API keys via .env)
// Using require to avoid TypeScript issues with dotenv types
const envPath = path.resolve(process.cwd(), '.env')
if (fsSync.existsSync(envPath)) {
  try {
    require('dotenv').config({ path: envPath })
    console.log('[Settings] Loaded .env file from:', envPath)
  } catch (e) {
    console.log('[Settings] Could not load .env file:', e)
  }
}

const CONFIG_DIR = 'config'
const SETTINGS_FILE = 'settings.json'

export interface LLMConfig {
  id: string
  name: string
  provider: 'claude' | 'openai' | 'gemini' | 'openrouter' | 'deepseek' | 'mistral' | 'minimax' | 'nanobanna' | 'custom'
  apiKey: string
  baseUrl?: string
  model: string
  isEnabled: boolean
}

export interface Settings {
  // LLM Provider
  llmProvider: 'claude' | 'openai' | 'gemini' | 'openrouter' | 'deepseek' | 'mistral' | 'minimax' | 'nanobanna' | 'custom'
  fallbackProvider?: 'openai' | 'claude' | 'gemini' | 'nanobanna'

  // Claude settings
  claudeApiKey: string
  claudeModel: string

  // MiniMax settings
  minimaxApiKey: string
  minimaxModel: string

  // NanoBanna settings (for slides & images generation)
  nanoBannaApiKey: string
  nanoBannaModel: string

  // OpenAI settings
  openaiApiKey: string
  openaiModel: string
  openaiBaseUrl: string

  // Google Gemini settings
  googleGeminiApiKey: string
  googleGeminiModel: string

  // OpenRouter settings
  openRouterApiKey: string
  openRouterModel: string

  // DeepSeek settings
  deepSeekApiKey: string
  deepSeekModel: string

  // Mistral settings
  mistralApiKey: string
  mistralModel: string

  // Custom provider (LM Studio / Ollama)
  customApiKey: string
  customBaseUrl: string
  customModel: string

  // Shared LLM settings
  maxTokens: number
  temperature: number
  systemPrompt: string

  // Telegram
  telegramBotToken: string
  telegramAutoConnect: boolean
  telegramGroups?: Record<string, { requireMention: boolean }>

  // Discord
  discordBotToken: string
  discordAutoConnect: boolean
  discordDmPolicy: 'pairing' | 'open' | 'closed'

  // Slack
  slackBotToken: string
  slackAppToken: string
  slackAutoConnect: boolean
  slackDmPolicy: 'pairing' | 'open' | 'closed'

  // WhatsApp
  whatsappEnabled: boolean

  // Signal
  signalEnabled: boolean
  signalCliPath?: string

  // Microsoft Teams
  teamsEnabled: boolean
  teamsAppId?: string
  teamsTenantId?: string
  teamsAppSecret?: string

  // Matrix
  matrixEnabled: boolean
  matrixHomeserver?: string
  matrixAccessToken?: string
  matrixUserId?: string

  // WebChat
  webChatEnabled: boolean

  // iMessage (BlueBubbles)
  imessageEnabled: boolean
  bluebubblesServerUrl?: string
  bluebubblesPassword?: string

  // Canvas / Visual Workspace
  canvasEnabled: boolean
  canvasStoragePath: string

  // Skills Platform
  skillsEnabled: boolean
  skillsPath: string
  skillsRegistryUrl?: string

  // Sessions
  sessionsEnabled: boolean

  // UI
  language: 'en' | 'ar' | 'he'
  theme: 'dark' | 'light'

  // Search
  tavilyApiKey: string

  // Features
  showAgentActivity: boolean
  sovereignMode: boolean
  planningMode: boolean
  chaosMode: boolean

  // Google
  googleApiKey: string
  googleAccessToken: string
  googleRefreshToken?: string

  // Cloud Storage
  dropboxAccessToken: string

  // Productivity
  notionToken: string
  airtableApiKey: string
  trelloApiKey: string
  trelloToken: string
  jiraEmail: string
  jiraApiToken: string
  jiraDomain: string
  githubToken: string

  // Social Media
  twitterBearerToken: string
  twitterRefreshToken?: string
  linkedinAccessToken: string
  linkedinRefreshToken?: string
  facebookAccessToken: string
  facebookRefreshToken?: string
  redditAccessToken: string
  redditRefreshToken?: string

  // Payments
  stripeSecretKey: string

  // Voice
  voiceProvider: 'system' | 'elevenlabs'
  elevenLabsApiKey: string
  globalHotkey: string

  // Email
  gmailAccessToken: string
  gmailRefreshToken?: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string

  // Sovereignty & Security
  localLLMOnly: boolean
  encryptMemory: boolean
  allowedNetworkHosts: string[] // Whitelist for network calls

  // Multi-LLM support
  llmConfigs: LLMConfig[]
}

const DEFAULT_SETTINGS: Settings = {
  llmProvider: 'claude',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-20250514',
  fallbackProvider: 'openai',
  minimaxApiKey: '',
  minimaxModel: 'MiniMax-M2.1',
  nanoBannaApiKey: '',
  nanoBannaModel: 'nano-banna-1.0',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  openaiBaseUrl: 'https://api.openai.com/v1',
  googleGeminiApiKey: '',
  googleGeminiModel: 'gemini-1.5-pro-latest',
  openRouterApiKey: '',
  openRouterModel: 'anthropic/claude-3-opus',
  deepSeekApiKey: '',
  deepSeekModel: 'deepseek-chat',
  mistralApiKey: '',
  mistralModel: 'mistral-large-latest',
  customApiKey: '',
  customBaseUrl: 'http://localhost:1234/v1',
  customModel: 'local-model',
  maxTokens: 8192,
  temperature: 0.7,
  systemPrompt: '',
  telegramBotToken: '',
  telegramAutoConnect: true,
  telegramGroups: {},
  discordBotToken: '',
  discordAutoConnect: true,
  discordDmPolicy: 'pairing',
  slackBotToken: '',
  slackAppToken: '',
  slackAutoConnect: true,
  slackDmPolicy: 'pairing',
  whatsappEnabled: false,
  signalEnabled: false,
  signalCliPath: '',
  teamsEnabled: false,
  teamsAppId: '',
  teamsTenantId: '',
  teamsAppSecret: '',
  matrixEnabled: false,
  matrixHomeserver: 'https://matrix.org',
  matrixAccessToken: '',
  matrixUserId: '',
  webChatEnabled: true,
  imessageEnabled: false,
  bluebubblesServerUrl: '',
  bluebubblesPassword: '',
  language: 'en',
  theme: 'dark',
  tavilyApiKey: '',
  voiceProvider: 'system',
  elevenLabsApiKey: '',
  globalHotkey: 'CommandOrControl+Shift+Space',

  showAgentActivity: false,
  sovereignMode: true,
  planningMode: false,
  chaosMode: false,
  googleApiKey: '',
  googleAccessToken: '',
  dropboxAccessToken: '',
  notionToken: '',
  airtableApiKey: '',
  trelloApiKey: '',
  trelloToken: '',
  jiraEmail: '',
  jiraApiToken: '',
  jiraDomain: '',
  githubToken: '',
  twitterBearerToken: '',
  linkedinAccessToken: '',
  facebookAccessToken: '',
  redditAccessToken: '',
  stripeSecretKey: '',
  gmailAccessToken: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  localLLMOnly: false,
  encryptMemory: false,
  allowedNetworkHosts: ['localhost', '127.0.0.1'],

  // Canvas / Visual Workspace
  canvasEnabled: true,
  canvasStoragePath: 'canvas',

  // Skills Platform
  skillsEnabled: true,
  skillsPath: 'skills',

  // Sessions
  sessionsEnabled: true,
  llmConfigs: []
}

function getDefaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS }
}

class SettingsManager {
  private settings: Settings
  private configPath: string = '' // Initialize as empty, set in initialize()
  private initialized = false

  constructor() {
    // Don't access app.getPath() here - Electron isn't ready yet!
    // Initialize with defaults
    this.settings = getDefaultSettings()
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Now we can safely access Electron app paths
    this.configPath = path.join(app.getPath('userData'), CONFIG_DIR)

    try {
      await fs.mkdir(this.configPath, { recursive: true })
      await this.load()
      console.log('[Settings] Initialized from:', this.configPath)
    } catch (error: any) {
      console.error('[Settings] Failed to initialize:', error.message)
      // Use defaults if load fails
      this.settings = getDefaultSettings()
    }

    this.initialized = true
  }

  private async load(): Promise<void> {
    const filePath = path.join(this.configPath, SETTINGS_FILE)
    const content = await fs.readFile(filePath, 'utf-8')
    const saved = JSON.parse(content)

    // Start with default settings, then merge saved settings
    let merged = { ...getDefaultSettings(), ...saved }

    // Override with environment variables if set (allows easy configuration)
    if (process.env.ANTHROPIC_API_KEY) {
      merged.claudeApiKey = process.env.ANTHROPIC_API_KEY
      console.log('[Settings] Using ANTHROPIC_API_KEY from environment')
    }
    if (process.env.OPENAI_API_KEY) {
      merged.openaiApiKey = process.env.OPENAI_API_KEY
      console.log('[Settings] Using OPENAI_API_KEY from environment')
    }
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) {
      merged.googleGeminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
      console.log('[Settings] Using GEMINI_API_KEY from environment')
    }
    if (process.env.OPENROUTER_API_KEY) {
      merged.openRouterApiKey = process.env.OPENROUTER_API_KEY
      console.log('[Settings] Using OPENROUTER_API_KEY from environment')
    }
    if (process.env.DEEPSEEK_API_KEY) {
      merged.deepSeekApiKey = process.env.DEEPSEEK_API_KEY
      console.log('[Settings] Using DEEPSEEK_API_KEY from environment')
    }
    if (process.env.MISTRAL_API_KEY) {
      merged.mistralApiKey = process.env.MISTRAL_API_KEY
      console.log('[Settings] Using MISTRAL_API_KEY from environment')
    }
    if (process.env.MINIMAX_API_KEY) {
      merged.minimaxApiKey = process.env.MINIMAX_API_KEY
      console.log('[Settings] Using MINIMAX_API_KEY from environment')
    }
    if (process.env.NANOBANNA_API_KEY) {
      merged.nanoBannaApiKey = process.env.NANOBANNA_API_KEY
      console.log('[Settings] Using NANOBANNA_API_KEY from environment')
    }
    if (process.env.CUSTOM_API_KEY) {
      merged.customApiKey = process.env.CUSTOM_API_KEY
      console.log('[Settings] Using CUSTOM_API_KEY from environment')
    }
    if (process.env.CUSTOM_BASE_URL) {
      merged.customBaseUrl = process.env.CUSTOM_BASE_URL
      console.log('[Settings] Using CUSTOM_BASE_URL from environment')
    }

    this.settings = merged
    console.log('[Settings] Loaded settings')
  }

  async getSettings(): Promise<Settings> {
    if (!this.initialized) await this.initialize()
    return { ...this.settings }
  }

  async get<K extends keyof Settings>(key: K): Promise<Settings[K]> {
    if (!this.initialized) await this.initialize()
    return this.settings[key]
  }

  getSettingsSync(): Settings {
    return { ...this.settings }
  }

  private async saveToFile(): Promise<void> {
    const filePath = path.join(this.configPath, SETTINGS_FILE)
    await fs.writeFile(filePath, JSON.stringify(this.settings, null, 2), 'utf-8')
  }

  async updateSettings(updates: Partial<Settings>): Promise<void> {
    if (!this.initialized) await this.initialize()
    this.settings = { ...this.settings, ...updates }
    await this.saveToFile()
    console.log('[Settings] Settings saved')
  }

  async resetSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS }
    await this.saveToFile()
    console.log('[Settings] Settings reset to defaults')
  }

  getProviderConfig(provider: string) {
    // Check if it matches a custom config ID first
    const customConfig = this.settings.llmConfigs?.find(c => c.id === provider)
    if (customConfig) {
      return {
        apiKey: customConfig.apiKey,
        baseUrl: customConfig.baseUrl || '',
        model: customConfig.model,
        provider: customConfig.provider
      }
    }

    switch (provider) {
      case 'claude':
        return {
          apiKey: this.settings.claudeApiKey,
          baseUrl: '',
          model: this.settings.claudeModel || 'claude-sonnet-4-20250514',
          provider
        }
      case 'minimax':
        return {
          apiKey: this.settings.minimaxApiKey,
          baseUrl: 'https://api.minimaxi.com/anthropic',
          model: this.settings.minimaxModel || 'MiniMax-M2.1',
          provider
        }
      case 'nanobanna':
        return {
          apiKey: this.settings.nanoBannaApiKey,
          baseUrl: '',
          model: this.settings.nanoBannaModel || 'nano-banna-1.0',
          provider
        }
      case 'openai':
        return {
          apiKey: this.settings.openaiApiKey,
          baseUrl: this.settings.openaiBaseUrl || 'https://api.openai.com/v1',
          model: this.settings.openaiModel || 'gpt-4o',
          provider
        }
      case 'gemini':
        return {
          apiKey: this.settings.googleGeminiApiKey,
          baseUrl: '',
          model: this.settings.googleGeminiModel || 'gemini-1.5-pro-latest',
          provider
        }
      case 'openrouter':
        return {
          apiKey: this.settings.openRouterApiKey,
          baseUrl: 'https://openrouter.ai/api/v1',
          model: this.settings.openRouterModel || 'anthropic/claude-3-opus',
          provider
        }
      case 'deepseek':
        return {
          apiKey: this.settings.deepSeekApiKey,
          baseUrl: 'https://api.deepseek.com/v1',
          model: this.settings.deepSeekModel || 'deepseek-chat',
          provider
        }
      case 'mistral':
        return {
          apiKey: this.settings.mistralApiKey,
          baseUrl: 'https://api.mistral.ai/v1',
          model: this.settings.mistralModel || 'mistral-large-latest',
          provider
        }
      case 'custom':
        return {
          apiKey: this.settings.customApiKey,
          baseUrl: this.settings.customBaseUrl || 'http://localhost:1234/v1',
          model: this.settings.customModel || 'local-model',
          provider
        }
      default:
        // Fallback to Claude default if unknown
        return {
          apiKey: this.settings.claudeApiKey,
          baseUrl: '',
          model: this.settings.claudeModel || 'claude-sonnet-4-20250514',
          provider: 'claude'
        }
    }
  }

  getEffectiveLLMConfig() {
    return this.getProviderConfig(this.settings.llmProvider || 'claude')
  }

  async testLLMConnection(provider: string, config?: LLMConfig): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now()
    try {
      let providerConfig: any

      if (config) {
        // Testing a custom LLM config
        providerConfig = {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || '',
          model: config.model,
          provider: config.provider
        }
      } else {
        // Testing a built-in provider
        providerConfig = this.getProviderConfig(provider)
      }

      const { apiKey, baseUrl, model, provider: providerType } = providerConfig

      if (!apiKey) {
        return { success: false, message: 'API key is missing' }
      }

      if (providerType === 'claude' || providerType === 'anthropic') {
        const client = new Anthropic({ apiKey, baseURL: baseUrl || undefined })
        await client.messages.create({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      } else if (providerType === 'gemini') {
        const client = new GoogleGenerativeAI(apiKey)
        const genModel = client.getGenerativeModel({ model: model || 'gemini-1.5-pro-latest' })
        await genModel.generateContent('Hi')
      } else {
        // OpenAI-compatible APIs (OpenAI, OpenRouter, DeepSeek, Mistral, Custom, MiniMax)
        const client = new OpenAI({ apiKey, baseURL: baseUrl || undefined, dangerouslyAllowBrowser: true })
        await client.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      }

      const latency = Date.now() - startTime
      return { success: true, message: 'Connection successful!', latency }
    } catch (error: any) {
      console.error('[Settings] LLM test failed:', error)
      return {
        success: false,
        message: error.message || 'Connection failed',
        latency: Date.now() - startTime
      }
    }
  }

  async testAllLLMConnections(): Promise<Map<string, { success: boolean; message: string; latency?: number }>> {
    const results = new Map()
    const providers = ['claude', 'openai', 'gemini', 'openrouter', 'deepseek', 'mistral', 'minimax', 'nanobanna', 'custom']

    for (const provider of providers) {
      const config = this.getProviderConfig(provider)
      if (config.apiKey) {
        const result = await this.testLLMConnection(provider)
        results.set(provider, result)
      }
    }

    // Test custom configs
    const customConfigs = this.settings.llmConfigs || []
    for (const config of customConfigs) {
      if (config.isEnabled && config.apiKey) {
        const result = await this.testLLMConnection(config.id, config)
        results.set(config.id, result)
      }
    }

    return results
  }
}

export const settingsManager = new SettingsManager()

export async function loadSettings(): Promise<Settings> {
  return settingsManager.getSettings()
}

export async function saveSettings(updates: Partial<Settings>): Promise<void> {
  return settingsManager.updateSettings(updates)
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  return settingsManager.get(key)
}

export async function testLLMConnection(provider: string, config?: LLMConfig): Promise<{ success: boolean; message: string; latency?: number }> {
  return settingsManager.testLLMConnection(provider, config)
}

export async function testAllLLMConnections(): Promise<Map<string, { success: boolean; message: string; latency?: number }>> {
  return settingsManager.testAllLLMConnections()
}

export function getSettingsSync(): Settings {
  return settingsManager.getSettingsSync()
}
