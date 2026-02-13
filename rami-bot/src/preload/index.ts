import { contextBridge, ipcRenderer } from 'electron'

export type Channels =
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close'
  | 'message:new'
  | 'telegram:status'
  | 'whatsapp:status'
  | 'signal:status'
  | 'teams:status'
  | 'matrix:status'
  | 'imessage:status'
  | 'whatsapp:qr'
  | 'agent:activity'
  | 'service:status'
  | 'learning:complete'
  | 'remote:message-received'
  | 'remote:command-received'
  | 'org:agent_hired'
  | 'org:status'
  | 'canvas:message'

const electronAPI = {
  // Core IPC
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
  openLogs: () => ipcRenderer.send('window:open-logs'),
  saveChat: () => ipcRenderer.invoke('chat:save'),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (updates: Record<string, unknown>) => ipcRenderer.invoke('settings:save', updates),
  testLLMConnection: (provider: string, config?: Record<string, unknown>) =>
    ipcRenderer.invoke('llm:testConnection', provider, config),
  testAllLLMConnections: () => ipcRenderer.invoke('llm:testAllConnections'),

  // Telegram
  telegramConnect: (token: string) => ipcRenderer.invoke('telegram:connect', token),
  telegramDisconnect: () => ipcRenderer.invoke('telegram:disconnect'),
  telegramGetStatus: () => ipcRenderer.invoke('telegram:getStatus'),
  telegramGetMessages: (chatId: string) => ipcRenderer.invoke('telegram:getMessages', chatId),
  telegramSendMessage: (chatId: string, text: string) => ipcRenderer.invoke('telegram:sendMessage', chatId, text),

  // Agent
  processMessage: (message: string, chatId: string, platform: string) =>
    ipcRenderer.invoke('agent:process', message, chatId, platform),

  // Tools
  executeBash: (command: string, timeout?: number) => ipcRenderer.invoke('tools:bash', command, timeout),
  fileEditor: (params: Record<string, unknown>) => ipcRenderer.invoke('tools:fileEditor', params),
  webSearch: (query: string, maxResults?: number) => ipcRenderer.invoke('tools:webSearch', query, maxResults),
  openBrowser: (url: string) => ipcRenderer.invoke('tools:openBrowser', url),
  googleSearch: (query: string) => ipcRenderer.invoke('tools:googleSearch', query),
  downloadFile: (url: string, filename?: string, outputDir?: string) =>
    ipcRenderer.invoke('tools:download', url, filename, outputDir),
  analyzeDocument: (path: string, prompt: string) => ipcRenderer.invoke('documents:analyze', path, prompt),

  // Vision
  takeScreenshot: () => ipcRenderer.invoke('vision:screenshot'),
  readClipboardImage: () => ipcRenderer.invoke('vision:clipboard'),

  // Services
  listServices: () => ipcRenderer.invoke('services:list'),
  createService: (config: Record<string, unknown>) => ipcRenderer.invoke('services:create', config),
  startService: (serviceId: string) => ipcRenderer.invoke('services:start', serviceId),
  stopService: (serviceId: string) => ipcRenderer.invoke('services:stop', serviceId),
  deleteService: (serviceId: string) => ipcRenderer.invoke('services:delete', serviceId),
  getServiceInfo: (serviceId: string) => ipcRenderer.invoke('services:getInfo', serviceId),
  getCoreStatus: () => ipcRenderer.invoke('services:getCoreStatus'),
  remoteStart: (port: number) => ipcRenderer.invoke('remote:start', port),
  remoteStop: () => ipcRenderer.invoke('remote:stop'),
  localAPIStart: (port: number) => ipcRenderer.invoke('localAPI:start', port),
  localAPIStop: () => ipcRenderer.invoke('localAPI:stop'),
  createDemoService: () => ipcRenderer.invoke('services:createDemo'),

  // Voice & Speech
  speak: (text: string, options?: Record<string, unknown>) => ipcRenderer.invoke('voice:speak', text, options),
  getVoices: () => ipcRenderer.invoke('voice:getVoices'),
  speakToFile: (text: string, outputPath?: string, options?: Record<string, unknown>) =>
    ipcRenderer.invoke('voice:speakToFile', text, outputPath, options),
  stopSpeaking: () => ipcRenderer.invoke('voice:stopSpeaking'),
  listen: (duration?: number) => ipcRenderer.invoke('voice:listen', duration),
  readClipboardAloud: () => ipcRenderer.invoke('voice:readClipboardAloud'),

  // Learning & Memory
  getLearningStats: () => ipcRenderer.invoke('learning:getStats'),
  recallMemories: (query: string, options?: Record<string, unknown>) =>
    ipcRenderer.invoke('learning:recall', query, options),
  teachFact: (fact: string) => ipcRenderer.invoke('learning:teachFact', fact),
  forgetMemory: (id: string) => ipcRenderer.invoke('learning:forget', id),
  ingestDocument: (filePath: string) => ipcRenderer.invoke('learning:ingestDocument', filePath),

  // Dialogs
  showOpenDialog: (options: Record<string, unknown>) => ipcRenderer.invoke('dialog:showOpen', options),
  showSaveDialog: (options: Record<string, unknown>) => ipcRenderer.invoke('dialog:showSave', options),

  // Dev Tools
  toggleDevTools: () => ipcRenderer.send('devtools:toggle'),

  // Synergy Organization
  getSynergyStatus: () => ipcRenderer.invoke('synergy:getStatus'),
  getSynergyDashboard: () => ipcRenderer.invoke('synergy:getDashboard'),
  startSynergy: () => ipcRenderer.invoke('synergy:start'),
  stopSynergy: () => ipcRenderer.invoke('synergy:stop'),
  createTask: (config: Record<string, unknown>) => ipcRenderer.invoke('synergy:createTask', config),
  ceoRespond: (decisionId: string, approved: boolean, comment?: string) =>
    ipcRenderer.invoke('synergy:ceoRespond', decisionId, approved, comment),
  getAgents: () => ipcRenderer.invoke('synergy:getAgents'),

  // Workflows
  listWorkflows: () => ipcRenderer.invoke('workflow:list'),
  createWorkflow: (config: Record<string, unknown>) => ipcRenderer.invoke('workflow:create', config),
  runWorkflow: (workflowId: string, input?: Record<string, unknown>) =>
    ipcRenderer.invoke('workflow:run', workflowId, input),
  getWorkflowTemplates: () => ipcRenderer.invoke('workflow:getTemplates'),

  // Global Planning
  previewProject: (objective: string) => ipcRenderer.invoke('synergy:previewProject', objective),
  createProjectFromPlan: (plan: any) => ipcRenderer.invoke('synergy:createProjectFromPlan', plan),


  // Email
  sendGmail: (to: string, subject: string, body: string, options?: Record<string, unknown>) =>
    ipcRenderer.invoke('email:sendGmail', to, subject, body, options),
  listGmail: (options?: Record<string, unknown>) => ipcRenderer.invoke('email:listGmail', options),
  getGmailMessage: (messageId: string) => ipcRenderer.invoke('email:getGmail', messageId),
  searchGmail: (query: string) => ipcRenderer.invoke('email:searchGmail', query),

  // Signal
  signalStart: (phoneNumber: string) => ipcRenderer.invoke('signal:start', phoneNumber),
  signalStop: () => ipcRenderer.invoke('signal:stop'),
  signalSend: (recipient: string, message: string) => ipcRenderer.invoke('signal:send', recipient, message),
  signalGetStatus: () => ipcRenderer.invoke('signal:getStatus'),

  // Test integrations
  testIntegration: (integrationId: string) => ipcRenderer.invoke('integration:test', integrationId),

  // Cron
  listCronTasks: () => ipcRenderer.invoke('cron:list'),
  createCronTask: (task: any) => ipcRenderer.invoke('cron:create', task),
  deleteCronTask: (id: string) => ipcRenderer.invoke('cron:delete', id),
  toggleCronTask: (id: string, enabled: boolean) => ipcRenderer.invoke('cron:toggle', id, enabled),

  // Import/Export (placeholder)
  exportSettings: async (filePath: string) => ({ success: true }),
  importSettings: async (filePath: string) => ({ success: true }),

  // Event listeners
  on: (channel: Channels, callback: (...args: unknown[]) => void) => {
    const handler = (_: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  // Analytics & Stats
  getAnalytics: () => ipcRenderer.invoke('learning:getAnalytics'),
  getVectorStats: () => ipcRenderer.invoke('learning:getVectorStats'),
  getGlobalStats: () => ipcRenderer.invoke('skills:getGlobalStats'),
  getAgentMetrics: () => ipcRenderer.invoke('synergy:getAgentMetrics'),
  getCollaborationGraph: () => ipcRenderer.invoke('synergy:getCollaborationGraph'),
  getAllProfiles: () => ipcRenderer.invoke('skills:getAllProfiles'),

  off: (channel: Channels, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
  onTelegramStatusChanged: (callback: (status: string) => void) => {
    const handler = (_: any, status: string) => callback(status)
    ipcRenderer.on('telegram:status', handler)
    return () => ipcRenderer.removeListener('telegram:status', handler)
  },
  onAgentActivity: (callback: (activity: any) => void) => {
    const handler = (_: any, activity: any) => callback(activity)
    ipcRenderer.on('agent:activity', handler)
    return () => ipcRenderer.removeListener('agent:activity', handler)
  },
  onLearningComplete: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('learning:complete', handler)
    return () => ipcRenderer.removeListener('learning:complete', handler)
  },
  onOrgUpdate: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('org:update', handler)
    return () => ipcRenderer.removeListener('org:update', handler)
  },

  // Agent Management
  saveAgent: (agent: any) => ipcRenderer.invoke('agent:save', agent),
  deleteAgent: (id: string) => ipcRenderer.invoke('agent:delete', id),
  createAgent: (config: any) => ipcRenderer.invoke('agent:create', config),
  startCollaboration: (agentIds: string[], task: string) => ipcRenderer.invoke('agent:collaborate', agentIds, task),

  // Skills
  getSkills: () => ipcRenderer.invoke('skills:get'),
  saveSkill: (skill: any) => ipcRenderer.invoke('skills:save', skill),
  deleteSkill: (id: string) => ipcRenderer.invoke('skills:delete', id),
  toggleSkill: (id: string) => ipcRenderer.invoke('skills:toggle', id),
  importSkill: (filePath: string) => ipcRenderer.invoke('skills:import', filePath),
  exportSkill: async (id: string, filePath: string) => ({ success: true }), // Placeholder

  // Automation
  cronList: () => ipcRenderer.invoke('cron:list'),
  cronCreate: (name: string, command: string, type: 'recurring' | 'one-time', schedule?: string, timestamp?: number) => ipcRenderer.invoke('cron:create', name, command, type, schedule, timestamp),
  cronDelete: (id: string) => ipcRenderer.invoke('cron:delete', id),
  cronToggle: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('cron:toggle', id, enabled),

  workflowList: () => ipcRenderer.invoke('workflow:list'),
  workflowTemplates: () => ipcRenderer.invoke('workflow:templates'),
  workflowCreate: (config: any) => ipcRenderer.invoke('workflow:create', config),
  workflowRun: (id: string, input: any) => ipcRenderer.invoke('workflow:run', id, input),
  workflowDelete: (id: string) => ipcRenderer.invoke('workflow:delete', id),
  workflowHistory: (workflowId?: string) => ipcRenderer.invoke('workflow:history', workflowId)
}

contextBridge.exposeInMainWorld('electron', electronAPI)

export type ElectronAPI = typeof electronAPI
