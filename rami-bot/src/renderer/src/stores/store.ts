import { create } from 'zustand'

export interface Message {
  id: string
  chatId: string
  text: string
  sender: 'user' | 'bot' | 'agent'
  timestamp: number
  platform: string
  agentName?: string
  agentAvatar?: string
  image?: string // Base64 image data
}

export interface AgentActivity {
  type: 'thinking' | 'tool_use' | 'responding' | 'idle'
  toolName?: string
}

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
  llmProvider: 'claude' | 'openai' | 'gemini' | 'openrouter' | 'deepseek' | 'mistral' | 'minimax' | 'nanobanna' | 'custom'
  fallbackProvider?: 'claude' | 'openai' | 'gemini' | 'nanobanna'
  llmConfigs: LLMConfig[]
  claudeApiKey: string
  claudeModel: string
  openaiApiKey: string
  openaiModel: string
  openaiBaseUrl: string
  googleGeminiApiKey: string
  googleGeminiModel: string
  openRouterApiKey: string
  openRouterModel: string
  deepSeekApiKey: string
  deepSeekModel: string
  mistralApiKey: string
  mistralModel: string
  minimaxApiKey: string
  minimaxModel: string
  nanoBannaApiKey: string
  nanoBannaModel: string
  customApiKey: string
  customBaseUrl: string
  customModel: string
  telegramBotToken: string
  telegramAutoConnect: boolean
  discordBotToken: string
  discordAutoConnect: boolean
  discordDmPolicy: 'pairing' | 'open' | 'closed'
  slackBotToken: string
  slackAppToken: string
  slackAutoConnect: boolean
  slackDmPolicy: 'pairing' | 'open' | 'closed'
  whatsappEnabled: boolean
  signalEnabled: boolean
  signalCliPath: string
  teamsEnabled: boolean
  teamsAppId: string
  teamsTenantId: string
  teamsAppSecret: string
  matrixEnabled: boolean
  matrixHomeserver: string
  matrixAccessToken: string
  matrixUserId: string
  webChatEnabled: boolean
  imessageEnabled: boolean
  bluebubblesServerUrl: string
  bluebubblesPassword: string
  canvasEnabled: boolean
  skillsEnabled: boolean
  sessionsEnabled: boolean
  tavilyApiKey: string
  elevenLabsApiKey: string
  voiceAutoRead: boolean
  voiceProvider: 'system' | 'elevenlabs'
  globalHotkey: string
  language: 'en' | 'ar' | 'he'
  maxTokens: number
  temperature: number
  systemPrompt: string
  planningMode: boolean
  chaosMode: boolean
  soul?: Soul
  userName?: string
  botName?: string
}

export interface Soul {
  name: string
  role: string
  mission: string
  domain: string
  tone: string
  moralCompass: string
  autonomyLevel: 'read_only' | 'safe_actions' | 'full_control'
  confidenceThreshold?: number // 0.0 - 1.0
  decisionMode?: 'read_only' | 'think_first' | 'act_autonomous'
  escalationProtocol?: 'always_ask' | 'ask_on_low_confidence' | 'autonomous'
  riskTolerance?: 'low' | 'medium' | 'high'
  memoryGatekeeper?: string // Instructions on what to remember
}

interface AppState {
  // Platform status
  telegramStatus: string
  discordStatus: string
  slackStatus: string
  whatsappStatus: string
  signalStatus: string
  teamsStatus: string
  matrixStatus: string
  imessageStatus: string

  // Current view
  currentView: 'chat' | 'settings' | 'services' | 'telegram' | 'whatsapp' | 'discord' | 'signal' | 'teams' | 'matrix' | 'imessage' | 'slack' | 'synergy' | 'quality' | 'automation' | 'integrations' | 'canvas'
  currentPlatform: 'telegram' | 'discord' | 'whatsapp' | 'slack' | 'signal' | 'teams' | 'matrix' | 'imessage' | 'services' | 'settings'
  currentChatId: string | null

  // Messages
  messages: Message[]

  // Agent
  agentActivity: AgentActivity
  isGodMode: boolean

  // Settings
  settings: Settings | null
  settingsLoaded: boolean
  hasOnboarded: boolean

  // Actions
  setTelegramStatus: (status: string) => void
  setDiscordStatus: (status: string) => void
  setSlackStatus: (status: string) => void
  setWhatsappStatus: (status: string) => void
  setSignalStatus: (status: string) => void
  setTeamsStatus: (status: string) => void
  setMatrixStatus: (status: string) => void
  setImessageStatus: (status: string) => void
  setCurrentView: (view: AppState['currentView']) => void
  setCurrentPlatform: (platform: AppState['currentPlatform']) => void
  setCurrentChatId: (chatId: string | null) => void
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setAgentActivity: (activity: AgentActivity) => void
  setIsGodMode: (isGodMode: boolean) => void
  setSettings: (settings: Settings) => void
  updateSettings: (updates: Partial<Settings>) => void
  setHasOnboarded: (hasOnboarded: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  telegramStatus: 'disconnected',
  discordStatus: 'disconnected',
  slackStatus: 'disconnected',
  whatsappStatus: 'disconnected',
  signalStatus: 'disconnected',
  teamsStatus: 'disconnected',
  matrixStatus: 'disconnected',
  imessageStatus: 'disconnected',
  currentView: 'chat',
  currentPlatform: 'telegram',
  currentChatId: null,
  messages: [],
  agentActivity: { type: 'idle' },
  isGodMode: false,
  settings: null,
  settingsLoaded: false,
  hasOnboarded: false,

  // Actions
  setTelegramStatus: (status: string) => set({ telegramStatus: status }),
  setDiscordStatus: (status: string) => set({ discordStatus: status }),
  setSlackStatus: (status: string) => set({ slackStatus: status }),
  setWhatsappStatus: (status: string) => set({ whatsappStatus: status }),
  setSignalStatus: (status: string) => set({ signalStatus: status }),
  setTeamsStatus: (status: string) => set({ teamsStatus: status }),
  setMatrixStatus: (status: string) => set({ matrixStatus: status }),
  setImessageStatus: (status: string) => set({ imessageStatus: status }),
  setCurrentView: (view: AppState['currentView']) => set({ currentView: view }),
  setCurrentPlatform: (platform: AppState['currentPlatform']) => set({ currentPlatform: platform }),
  setCurrentChatId: (chatId: string | null) => set({ currentChatId: chatId }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  setMessages: (messages) => set({ messages }),

  setAgentActivity: (activity) => set({ agentActivity: activity }),

  setIsGodMode: (isGodMode) => set({ isGodMode }),

  setSettings: (settings) => set({ settings, settingsLoaded: true, hasOnboarded: !!settings.userName }),

  updateSettings: (updates) => set((state) => ({
    settings: state.settings ? { ...state.settings, ...updates } : null
  })),

  setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),

  // Ensure robust handling
  resetSettings: () => set({ settings: null, settingsLoaded: false })
}))
