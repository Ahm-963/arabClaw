import { app, shell, BrowserWindow, ipcMain, globalShortcut, clipboard } from 'electron'
import { join } from 'path'
// Using native Electron APIs instead of electron-toolkit
import { settingsManager, loadSettings, saveSettings, testLLMConnection, testAllLLMConnections, LLMConfig } from './settings'
import { testIntegration } from './integrations'
import { appEvents } from './events'
import { TelegramBot } from './platforms/telegram'
import { whatsappBot } from './platforms/whatsapp'
import { signalBot } from './platforms/signal'
import { teamsBot } from './platforms/teams'
import { matrixBot } from './platforms/matrix'
import { imessageBot } from './platforms/imessage'
import { ServiceManager } from './services/service-manager'
import { LocalAPIServer } from './api/local-server'
import { executeCommand } from './tools/bash'
import { fileEditor } from './tools/file-editor'
import { webSearch } from './tools/web-search'
import { downloadFile } from './tools/download'
import { takeScreenshot, getClipboardImage } from './tools/vision'
import { canvasManager, canvasGet, canvasPush, canvasReset, canvasExport } from './tools/canvas'
import { LLMAgent } from './llm/llm-agent'
import { SynergyManager } from './organization/synergy-manager'
import { selfLearningAgent } from './learning/self-learning-agent'
import { chaosManager } from './quality/chaos-manager'
import { qaScorer } from './quality/qa-scorer'
import { patternDetector } from './quality/pattern-detector'
import { playbookManager } from './quality/playbook-manager'
import { cronManager } from './services/cron-manager'
import { workflowEngine } from './automation/workflow-engine'
import { auditLogger } from './organization/audit-logger'
import { goalManager } from './organization/goal-manager'
import { policyEngine } from './organization/policy-engine'

let mainWindow: BrowserWindow | null = null
let telegramBot: TelegramBot | null = null
let serviceManager: ServiceManager | null = null
let localServer: LocalAPIServer | null = null
let claudeAgent: LLMAgent | null = null
let synergyManager: SynergyManager | null = null
let remoteServer: any = null
let pluginManager: any = null

// Global Error Handlers
process.on('uncaughtException', (error) => {
  console.error('[Main] 🚨 UNCAUGHT EXCEPTION:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] 🚨 UNHANDLED REJECTION:', reason)
})

function createWindow(): void {
  console.log('[Window] Creating main window...')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#ffffff',
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: join(__dirname, '../../resources/icon.png')
  })

  mainWindow.on('ready-to-show', () => {
    console.log('[Window] Ready to show event fired - displaying window')
    mainWindow?.show()
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Window] Failed to load:', errorCode, errorDescription)
    // Show window anyway so user can see the error
    mainWindow?.show()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Window] Content loaded successfully')
    // Force show window here since ready-to-show sometimes doesn't fire
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        console.log('[Window] Forcing window to show (ready-to-show event did not fire)')
        mainWindow.show()
      }
    }, 500)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Check if in development mode using native Electron
  const url = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173'
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[Window] Loading dev server:', url)
    mainWindow.loadURL(url)
  } else {
    const htmlPath = join(__dirname, '../renderer/index.html')
    console.log('[Window] Loading file:', htmlPath)
    mainWindow.loadFile(htmlPath)
  }
}

// Initialize services
async function initializeServices(): Promise<void> {
  console.log('[Main] Initializing services...')

  console.log('[Main] 1/6 Initializing settings...')
  // Initialize settings
  await settingsManager.initialize()
  const settings = await loadSettings()
  console.log('[Main] ✓ Settings loaded')

  console.log('[Main] 2/6 Initializing LLM Agent...')
  // Initialize LLM Agent
  claudeAgent = new LLMAgent()
  console.log('[Main] ✓ LLM Agent created')

  console.log('[Main] 3/6 Initializing Synergy Manager...')
  // Initialize Synergy Manager (Agent Organization)
  synergyManager = new SynergyManager()
  await synergyManager.initialize()
  console.log('[Main] ✓ Synergy Manager initialized with', synergyManager.getAgents().length, 'agents')

  // Auto-start Synergy Manager if sovereign mode is enabled
  if (settings.sovereignMode) {
    console.log('[Main] ⚡ Sovereign Mode enabled - Starting autonomous organization...')
    await synergyManager.start()
    console.log('[Main] ✓ Autonomous organization started')
  }

  console.log('[Main] 4/6 Initializing Self-Learning Agent...')
  // Initialize Self-Learning Agent & Memory
  await selfLearningAgent.initialize()
  console.log('[Main] ✓ Self-Learning Agent initialized')

  console.log('[Main] 4.5/6 Initializing Playbook Manager...')
  // Initialize Playbook Manager for Quality Dashboard
  await playbookManager.initialize()
  console.log('[Main] ✓ Playbook Manager initialized')

  console.log('[Main] 5/6 Initializing Telegram Bot...')
  // Initialize Telegram Bot (non-blocking)
  if (settings.telegramBotToken && settings.telegramAutoConnect) {
    try {
      telegramBot = new TelegramBot(settings.telegramBotToken)
      telegramBot.setSynergyManager(synergyManager)
      // Start in background to avoid blocking
      telegramBot.start().catch(err => console.error('[Telegram] Startup error:', err))
      console.log('[Main] ✓ Telegram Bot starting in background')
    } catch (err) {
      console.error('[Main] Telegram Bot initialization failed:', err)
    }
  } else {
    console.log('[Main] ✓ Telegram Bot skipped (not configured)')
  }

  console.log('[Main] 5.5/6 Initializing Service Manager...')
  // Initialize Service Manager
  serviceManager = new ServiceManager()
  await serviceManager.initialize()
  console.log('[Main] ✓ Service Manager initialized')

  console.log('[Main] 6/6 Initializing Local API Server...')
  // Initialize Local API Server (non-blocking)
  try {
    localServer = new LocalAPIServer(31415)
    // Start in background to avoid blocking
    localServer.start().catch(err => console.error('[LocalAPI] Startup error:', err))
    console.log('[Main] ✓ Local API Server starting in background')
  } catch (err) {
    console.error('[Main] Local API Server initialization failed:', err)
  }

  console.log('[Main] 6.5/6 Initializing Canvas Manager...')
  await canvasManager.initialize()
  console.log('[Main] ✓ Canvas Manager initialized')

  console.log('[Main] ✅ All services initialized successfully')
}

// Helper for Global Hotkey  
function registerGlobalHotkey(hotkey: string) {
  // TEMPORARILY DISABLED - causing startup freeze
  console.log('[Hotkey] Registration disabled temporarily to fix startup freeze')
  console.log('[Hotkey] Requested hotkey was:', hotkey)
  return

  /* 
  // Defer hotkey registration to prevent blocking startup
  setTimeout(() => {
    console.log('[Hotkey] Attempting to register hotkey:', hotkey)

    // Unregister all first
    try {
      globalShortcut.unregisterAll()
    } catch (error) {
      console.warn('[Hotkey] Failed to unregister:', error)
    }

    if (!hotkey) {
      console.log('[Hotkey] No hotkey configured, skipping registration')
      return
    }

    try {
      const ret = globalShortcut.register(hotkey, () => {
        console.log('[Hotkey] Global hotkey triggered:', hotkey)
        if (mainWindow) {
          if (!mainWindow.isVisible()) mainWindow.show()
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
          mainWindow.webContents.send('voice:listen-start')
        }
      })

      if (!ret) {
        console.warn('[Hotkey] Registration failed for:', hotkey)
      } else {
        console.log('[Hotkey] ✅ Successfully registered:', hotkey)
      }
    } catch (error: any) {
      console.error('[Hotkey] Registration error:', error.message)
    }
  }, 1000) // Delay by 1 second to not block startup
  */
}

// IPC Handlers
function setupIpcHandlers(): void {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  ipcMain.on('window:open-logs', () => {
    shell.openPath(app.getPath('userData'))
  })

  // Settings
  ipcMain.handle('settings:load', async () => {
    return await loadSettings()
  })

  ipcMain.handle('settings:save', async (_, updates) => {
    await saveSettings(updates)

    // Reconnect Telegram if token changed
    if (updates.telegramBotToken !== undefined) {
      if (telegramBot) {
        await telegramBot.stop()
      }
      if (updates.telegramBotToken) {
        telegramBot = new TelegramBot(updates.telegramBotToken)
        await telegramBot.start()
      }
    }

    // Update Global Hotkey
    if (updates.globalHotkey) {
      registerGlobalHotkey(updates.globalHotkey)
    }

    return true
  })

  // LLM Testing
  ipcMain.handle('llm:testConnection', async (_, provider: string, config?: LLMConfig) => {
    try {
      return await testLLMConnection(provider, config)
    } catch (error: any) {
      console.error('[IPC] llm:testConnection error:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('llm:testAllConnections', async () => {
    try {
      const results = await testAllLLMConnections()
      return Object.fromEntries(results)
    } catch (error: any) {
      console.error('[IPC] llm:testAllConnections error:', error)
      return {}
    }
  })


  ipcMain.handle('telegram:connect', async (_, token: string) => {
    if (telegramBot) {
      await telegramBot.stop()
    }
    telegramBot = new TelegramBot(token)
    await telegramBot.start()
    return true
  })


  ipcMain.handle('telegram:disconnect', async () => {
    if (telegramBot) {
      await telegramBot.stop()
      telegramBot = null
    }
    return true
  })

  ipcMain.handle('telegram:getStatus', () => {
    return telegramBot?.getStatus() || 'disconnected'
  })

  ipcMain.handle('telegram:getMessages', async (_, chatId: string) => {
    return telegramBot?.getMessages(chatId) || []
  })

  ipcMain.handle('telegram:sendMessage', async (_, chatId: string, text: string) => {
    return telegramBot?.sendMessage(chatId, text)
  })

  // WhatsApp
  ipcMain.handle('whatsapp:connect', async () => {
    whatsappBot.setMessageProcessor(async (msg, cid, plt) => {
      return await claudeAgent?.processMessage(msg, cid, plt) || ''
    })
    await whatsappBot.start()
    return true
  })

  ipcMain.handle('whatsapp:getStatus', () => whatsappBot.getStatus())
  ipcMain.handle('whatsapp:getQR', () => whatsappBot.getQRCode())

  // Signal
  ipcMain.handle('signal:connect', async (_, config) => {
    signalBot.setMessageProcessor(async (msg, cid, plt) => {
      return await claudeAgent?.processMessage(msg, cid, plt) || ''
    })
    await signalBot.initialize()
    if (config?.phoneNumber) {
      await signalBot.start(config.phoneNumber)
    }
    return true
  })

  ipcMain.handle('signal:getStatus', () => signalBot.getStatus())

  // Teams
  ipcMain.handle('teams:connect', async (_, config) => {
    teamsBot.setMessageProcessor(async (msg, cid, plt) => {
      return await claudeAgent?.processMessage(msg, cid, plt) || ''
    })
    await teamsBot.start(config)
    return true
  })

  ipcMain.handle('teams:getStatus', () => teamsBot.getStatus())

  // Matrix
  ipcMain.handle('matrix:connect', async (_, config) => {
    matrixBot.setMessageProcessor(async (msg, cid, plt) => {
      return await claudeAgent?.processMessage(msg, cid, plt) || ''
    })
    await matrixBot.start(config)
    return true
  })

  ipcMain.handle('matrix:getStatus', () => matrixBot.getStatus())

  // iMessage
  ipcMain.handle('imessage:connect', async (_, config) => {
    imessageBot.setMessageProcessor(async (msg, cid, plt) => {
      return await claudeAgent?.processMessage(msg, cid, plt) || ''
    })
    await imessageBot.start(config)
    return true
  })

  ipcMain.handle('imessage:getStatus', () => imessageBot.getStatus())

  // AI Agent
  ipcMain.handle('agent:process', async (_, message: string, chatId: string, platform: string) => {
    if (!claudeAgent) {
      throw new Error('Claude Agent not initialized')
    }
    return await claudeAgent.processMessage(message, chatId, platform)
  })

  // Tools
  ipcMain.handle('tools:bash', async (_, command: string, timeout?: number) => {
    return await executeCommand(command, timeout)
  })

  ipcMain.handle('tools:fileEditor', async (_, params) => {
    return await fileEditor(params)
  })

  ipcMain.handle('tools:webSearch', async (_, query: string, maxResults?: number) => {
    return await webSearch(query, maxResults)
  })

  ipcMain.handle('tools:openBrowser', async (_, url: string) => {
    // Lazy import to avoid circular dependencies if any
    const { openBrowser } = await import('./tools/browser')
    return await openBrowser(url)
  })

  ipcMain.handle('tools:googleSearch', async (_, query: string) => {
    const { googleSearch } = await import('./tools/browser')
    return await googleSearch(query)
  })

  ipcMain.handle('tools:download', async (_, url: string, filename?: string, outputDir?: string) => {
    return await downloadFile(url, filename, outputDir)
  })

  // Vision Tools
  ipcMain.handle('vision:screenshot', async () => {
    return await takeScreenshot()
  })

  ipcMain.handle('vision:clipboard', async () => {
    return await getClipboardImage()
  })

  // Voice Service
  ipcMain.handle('voice:getVoices', async () => {
    // Lazy import to avoid initialization issues if any
    const { voiceService } = await import('./services/voice-service')
    const voices = await voiceService.getVoices()
    return { success: true, data: voices }
  })

  ipcMain.handle('voice:speak', async (_, text: string, options: any) => {
    const { voiceService } = await import('./services/voice-service')
    try {
      const result = await voiceService.textToSpeech(text, options?.voice)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Voice speak error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('voice:saveToFile', async (_, text: string, filePath: string, options: any) => {
    const { voiceService } = await import('./services/voice-service')
    try {
      await voiceService.saveAudioToFile(text, filePath, options?.voice)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('voice:stopSpeaking', async () => {
    // Current playback is client-side, so no server-side stop needed yet
    // But we might stop streaming if we implemented that.
    return { success: true }
  })

  ipcMain.handle('voice:readClipboardAloud', async (_, options: any) => {
    const { voiceService } = await import('./services/voice-service')
    const text = clipboard.readText()

    if (!text) return { success: false, error: 'Clipboard is empty' }

    try {
      const result = await voiceService.textToSpeech(text, options?.voice)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })





  // Services
  ipcMain.handle('services:list', async () => {
    return serviceManager?.listServices() || []
  })

  ipcMain.handle('services:create', async (_, config) => {
    return serviceManager?.createService(config)
  })

  ipcMain.handle('services:start', async (_, serviceId: string) => {
    return serviceManager?.startService(serviceId)
  })

  ipcMain.handle('services:stop', async (_, serviceId: string) => {
    return serviceManager?.stopService(serviceId)
  })

  ipcMain.handle('services:delete', async (_, serviceId: string) => {
    return serviceManager?.deleteService(serviceId)
  })

  ipcMain.handle('services:getInfo', async (_, serviceId: string) => {
    return serviceManager?.getServiceInfo(serviceId)
  })

  // Synergy Manager (Agent Organization)
  ipcMain.handle('services:getCoreStatus', async () => {
    return {
      remoteServer: remoteServer?.isRunning() || false,
      localAPI: localServer?.isRunning() || false,
      synergy: synergyManager?.getIsRunning() || false,
      workerCount: synergyManager?.getAgents().length || 0
    }
  })

  ipcMain.handle('services:createDemo', async () => {
    return serviceManager?.createDemoService()
  })

  ipcMain.handle('synergy:getStatus', async () => {
    if (!synergyManager) return { running: false, agents: 0, tasks: 0 }
    return {
      running: synergyManager['isRunning'],
      agents: synergyManager['agents'].size,
      tasks: synergyManager['tasks'].size,
      pendingDecisions: synergyManager['decisions'].size
    }
  })

  ipcMain.handle('synergy:getDashboard', async () => {
    if (!synergyManager) return null
    return synergyManager.getDashboardSnapshot()
  })

  ipcMain.handle('sessions:list', async () => {
    if (!synergyManager) return { sessions: [] }
    return { sessions: synergyManager.getSessions() }
  })

  // Canvas Handlers
  ipcMain.handle('canvas:get', async () => {
    return await canvasGet()
  })

  ipcMain.handle('canvas:push', async (_, data) => {
    return await canvasPush(data)
  })

  ipcMain.handle('canvas:reset', async () => {
    return await canvasReset()
  })

  ipcMain.handle('canvas:clear', async () => {
    return await canvasReset()
  })

  ipcMain.handle('canvas:export', async (_, data) => {
    return await canvasExport(data)
  })

  ipcMain.handle('synergy:start', async () => {
    if (!synergyManager) throw new Error('Synergy Manager not initialized')
    await synergyManager.start()
    return true
  })

  ipcMain.handle('synergy:stop', async () => {
    if (!synergyManager) return false
    await synergyManager.stop()
    return true
  })

  ipcMain.handle('synergy:createTask', async (_, config) => {
    if (!synergyManager) throw new Error('Synergy Manager not initialized')
    return await synergyManager.createTask(config)
  })

  ipcMain.handle('synergy:userObjective', async (_, objective: string) => {
    if (!synergyManager) throw new Error('Synergy Manager not initialized')
    try {
      const result = await synergyManager.createProject(objective) // Use createProject for high-level objectives
      console.log('[Synergy] User objective processed successfully:', result.projectId)
      return result
    } catch (error: any) {
      console.error('[Synergy] Error processing user objective:', error.message)
      throw new Error(`Failed to process swarm objective: ${error.message}`)
    }
  })

  ipcMain.handle('synergy:previewProject', async (_, objective: string) => {
    if (!synergyManager) throw new Error('Synergy Manager not initialized')
    return await synergyManager.previewProject(objective)
  })

  ipcMain.handle('synergy:createProjectFromPlan', async (_, plan: any) => {
    if (!synergyManager) throw new Error('Synergy Manager not initialized')
    return await synergyManager.createProjectFromPlan(plan)
  })

  ipcMain.handle('synergy:ceoRespond', async (_, decisionId: string, approved: boolean, comment?: string) => {
    if (!synergyManager) throw new Error('Synergy Manager not initialized')
    const callback = synergyManager['ceoCallbacks'].get(decisionId)
    if (callback) {
      callback(approved)
    }
    return true
  })

  ipcMain.handle('synergy:getAgentMetrics', async () => {
    if (!synergyManager) return []
    return synergyManager.getAgentMetrics()
  })

  ipcMain.handle('synergy:getCollaborationGraph', async () => {
    if (!synergyManager) return { nodes: [], links: [] }
    return synergyManager.getCollaborationGraph()
  })


  ipcMain.handle('synergy:getAgents', async () => {
    if (!synergyManager) return []
    const agents = Array.from(synergyManager['agents'].values())
    // Map to UI-friendly format
    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      personality: agent.personality,
      systemPrompt: agent.systemPrompt,
      skills: agent.skills,
      color: getAgentColor(agent.name),
      avatar: getAgentAvatar(agent.name),
      isActive: agent.status !== 'offline',
      createdAt: agent.hiredAt,
      lastUsed: agent.hiredAt
    }))
  })

  ipcMain.handle('synergy:getCollaborationHistory', async () => {
    if (!synergyManager) return []
    return (synergyManager as any).collabHistory?.getRecentRecords(100) || []
  })

  ipcMain.handle('synergy:getAuditLog', async () => {
    return await auditLogger.query({ limit: 100 })
  })

  ipcMain.handle('synergy:getPolicies', async () => {
    return policyEngine.getAllPermissions()
  })

  ipcMain.handle('synergy:getGoals', async () => {
    const activeGoal = await goalManager.getActiveGoal()
    return activeGoal ? [activeGoal] : []
  })

  ipcMain.handle('synergy:exportAuditLog', async (_, outputPath: string) => {
    await auditLogger.exportToCSV(outputPath)
    return { success: true }
  })

  // Advanced Orchestration & Synergy
  ipcMain.handle('synergy:getConflicts', async () => {
    if (!synergyManager) return []
    return synergyManager.getConflicts()
  })

  ipcMain.handle('synergy:getTruthClaims', async () => {
    if (!synergyManager) return []
    return synergyManager.getTruthClaims()
  })

  ipcMain.handle('synergy:getRollbackHistory', async () => {
    const { rollbackManager } = await import('./organization/rollback-manager')
    return rollbackManager.getHistory(50)
  })

  ipcMain.handle('synergy:performRollback', async (_, entryId: string) => {
    const { rollbackManager } = await import('./organization/rollback-manager')
    return await rollbackManager.rollback(entryId)
  })

  // Integrations Testing
  ipcMain.handle('integration:test', async (_, integrationId: string) => {
    console.log(`[Integration] Testing connection for: ${integrationId}`)
    try {
      // Use the integration manager for all integrations
      return await testIntegration(integrationId)
    } catch (error: any) {
      console.error(`[Integration] Test failed for ${integrationId}:`, error.message)
      return { success: false, error: error.message }
    }
  })

  // ============ SKILLS & LEVELING HANDLERS ============

  ipcMain.handle('skills:getAgentProfile', async (_, agentId: string) => {
    const { skillProgressionManager } = await import('./learning/skill-progression-manager')
    return await skillProgressionManager.getProgressionReport(agentId)
  })

  ipcMain.handle('skills:getAllProfiles', async () => {
    const { skillProgressionManager } = await import('./learning/skill-progression-manager')
    return skillProgressionManager.getAllProfiles()
  })

  ipcMain.handle('skills:getGlobalStats', async () => {
    const { skillProgressionManager } = await import('./learning/skill-progression-manager')
    return skillProgressionManager.getGlobalStats()
  })

  ipcMain.handle('skills:getAchievements', async (_, agentId: string) => {
    const { skillProgressionManager } = await import('./learning/skill-progression-manager')
    return skillProgressionManager.getAchievements(agentId)
  })

  // Remote Control Server
  ipcMain.handle('remote:start', async (_, port: number) => {
    if (!remoteServer) {
      // Late init to ensure mainWindow exists
      if (!mainWindow) throw new Error('Main window not ready')
      const { RemoteServer } = await import('./server/remote-server')
      remoteServer = new RemoteServer(mainWindow, synergyManager)
    }
    return await remoteServer.start(port || 3000)
  })

  ipcMain.handle('remote:stop', async () => {
    if (remoteServer) {
      await remoteServer.stop()
    }
    return true
  })

  // Local API Server
  ipcMain.handle('localAPI:start', async (_, port: number) => {
    if (!localServer) {
      localServer = new LocalAPIServer(port || 31415)
    }
    await localServer.start()
    return true
  })

  ipcMain.handle('localAPI:stop', async () => {
    if (localServer) {
      await localServer.stop()
    }
    return true
  })

  // Plugin Manager
  ipcMain.handle('skills:get', async () => {
    const plugins = pluginManager ? pluginManager.getPlugins() : []

    // Always include built-in skills if they aren't explicitly loaded as plugins
    const builtInSkills = [
      // File & System
      { id: 'bash', name: 'bash', description: 'Execute shell commands', category: 'file', isBuiltIn: true, isEnabled: true },
      { id: 'str_replace_editor', name: 'str_replace_editor', description: 'View and edit files', category: 'file', isBuiltIn: true, isEnabled: true },
      { id: 'start_process', name: 'start_process', description: 'Launch applications', category: 'system', isBuiltIn: true, isEnabled: true },
      { id: 'get_system_info', name: 'get_system_info', description: 'Get PC hardware & OS info', category: 'system', isBuiltIn: true, isEnabled: true },
      { id: 'get_weather', name: 'get_weather', description: 'Get current weather', category: 'system', isBuiltIn: true, isEnabled: true },

      // Web & Browser
      { id: 'web_search', name: 'web_search', description: 'Search the web', category: 'web', isBuiltIn: true, isEnabled: true },
      { id: 'open_browser', name: 'open_browser', description: 'Open URL in browser', category: 'web', isBuiltIn: true, isEnabled: true },

      // Vision & Computer Control
      { id: 'screenshot', name: 'screenshot', description: 'Capture screen', category: 'vision', isBuiltIn: true, isEnabled: true },
      { id: 'mouse_move', name: 'mouse_move', description: 'Move mouse cursor', category: 'vision', isBuiltIn: true, isEnabled: true },
      { id: 'type_text', name: 'type_text', description: 'Type text', category: 'vision', isBuiltIn: true, isEnabled: true },

      // Coding & Git
      { id: 'run_code', name: 'run_code', description: 'Run Python/JS code', category: 'developer', isBuiltIn: true, isEnabled: true },
      { id: 'git_clone', name: 'git_clone', description: 'Clone Git repositories', category: 'developer', isBuiltIn: true, isEnabled: true },
      { id: 'github_create_repo', name: 'github_create_repo', description: 'Manage GitHub repositories', category: 'developer', isBuiltIn: true, isEnabled: true },
      { id: 'github_search_repos', name: 'github_search_repos', description: 'Search GitHub', category: 'developer', isBuiltIn: true, isEnabled: true },

      // Communication & Voice
      { id: 'speak', name: 'speak', description: 'Text-to-speech', category: 'communication', isBuiltIn: true, isEnabled: true },
      { id: 'listen', name: 'listen', description: 'Listen for voice commands', category: 'communication', isBuiltIn: true, isEnabled: true },
      { id: 'email_send', name: 'email_send', description: 'Send emails', category: 'communication', isBuiltIn: true, isEnabled: true },

      // Media & Control
      { id: 'media_play_pause', name: 'media_play_pause', description: 'Control media playback', category: 'media', isBuiltIn: true, isEnabled: true },
      { id: 'system_lock', name: 'system_lock', description: 'Lock the computer', category: 'system', isBuiltIn: true, isEnabled: true },

      // Social Media
      { id: 'twitter_search', name: 'twitter_search', description: 'Search Twitter/X', category: 'social', isBuiltIn: true, isEnabled: true },
      { id: 'linkedin_share', name: 'linkedin_share', description: 'Share on LinkedIn', category: 'social', isBuiltIn: true, isEnabled: true },

      // Security
      { id: 'vault_list', name: 'vault_list', description: 'List secure secrets', category: 'security', isBuiltIn: true, isEnabled: true },
      { id: 'vault_request', name: 'vault_request', description: 'Request secret access', category: 'security', isBuiltIn: true, isEnabled: true },

      // Advanced Tools
      { id: 'canvas_push', name: 'canvas_push', description: 'Push content to visual workspace', category: 'productivity', isBuiltIn: true, isEnabled: true },
      { id: 'doc_analyze', name: 'doc_analyze', description: 'Deep document analysis', category: 'productivity', isBuiltIn: true, isEnabled: true }
    ]

    return [...builtInSkills, ...plugins]
  })

  ipcMain.handle('plugins:load', async (_, pluginPath: string) => {
    if (!pluginManager) return false
    return await pluginManager.loadPlugin(pluginPath)
  })

  ipcMain.handle('plugins:unload', async (_, pluginId: string) => {
    if (!pluginManager) return false
    return await pluginManager.unloadPlugin(pluginId)
  })

  // Skills


  // Document Analysis
  ipcMain.handle('documents:analyze', async (_, filePath: string, prompt: string) => {
    const { documentAnalysisService } = await import('./services/document-analysis')
    if (!claudeAgent) throw new Error('LLM Agent not initialized')
    return await documentAnalysisService.analyze(filePath, prompt, claudeAgent)
  })

  // Secure Vault
  ipcMain.handle('vault:store', async (_, name, type, data, metadata) => {
    const { vaultManager } = await import('./utils/vault-manager')
    return await vaultManager.storeSecret(name, type, data, metadata)
  })

  ipcMain.handle('vault:get', async (_, id) => {
    const { vaultManager } = await import('./utils/vault-manager')
    return await vaultManager.getSecret(id)
  })

  ipcMain.handle('vault:list', async () => {
    const { vaultManager } = await import('./utils/vault-manager')
    return await vaultManager.listSecrets()
  })

  ipcMain.handle('vault:delete', async (_, id) => {
    const { vaultManager } = await import('./utils/vault-manager')
    return await vaultManager.deleteSecret(id)
  })

  // Learning & Memory
  ipcMain.handle('learning:getStats', async () => {
    return selfLearningAgent.getStats()
  })

  ipcMain.handle('learning:recall', async (_, query, options) => {
    return await selfLearningAgent.recall(query)
  })

  ipcMain.handle('learning:teachFact', async (_, fact) => {
    try {
      const result = await selfLearningAgent.teachFact(fact)
      return { success: true, memory: result }
    } catch (error: any) {
      console.error('[IPC] teachFact failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('learning:forget', async (_, id) => {
    try {
      const { memoryManager } = await import('./learning/memory-manager')
      console.log('[Main] Forgetting memory:', id)
      const result = await memoryManager.forget(id)
      return { success: result }
    } catch (error: any) {
      console.error('[IPC] forget failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('learning:getAnalytics', async () => {
    try {
      const { memoryManager } = await import('./learning/memory-manager')
      return await memoryManager.getLearningAnalytics()
    } catch (error: any) {
      console.error('[IPC] learning:getAnalytics failed:', error)
      return { ingestionChart: [], distribution: [], totalMemories: 0, piiDetections: 0 }
    }
  })

  ipcMain.handle('learning:getVectorStats', async () => {
    try {
      const { vectorStore } = await import('./learning/vector-store')
      return await vectorStore.getStats()
    } catch (error: any) {
      console.error('[IPC] learning:getVectorStats failed:', error)
      return { totalVectors: 0, approximateSizeBase64: 0, initialized: false }
    }
  })

  ipcMain.handle('learning:ingestDocument', async (_, filePath) => {
    try {
      console.log('[Main] Ingesting document:', filePath)
      return await selfLearningAgent.ingestDocument(filePath)
    } catch (error: any) {
      console.error('[IPC] ingestDocument failed:', error)
      return { success: false, learnedCount: 0, error: error.message }
    }
  })

  // Quality Assurance - Chaos Manager
  ipcMain.handle('quality:getChaosStatus', async () => {
    const settings = await loadSettings()
    // Access private Set via bracket notation
    const experiments = (chaosManager as any).activeExperiments
    return {
      globalEnabled: settings.chaosMode || false,
      activeExperiments: Array.from(experiments)
    }
  })

  ipcMain.handle('quality:setChaosMode', async (_, config: {
    enabled: boolean
    experiments?: string[]
  }) => {
    // Update settings
    const settings = await loadSettings()
    settings.chaosMode = config.enabled
    await saveSettings(settings)

    // Start/stop experiments
    if (config.experiments) {
      config.experiments.forEach(exp => {
        if (config.enabled) {
          chaosManager.startExperiment(exp as any)
        } else {
          chaosManager.stopExperiment(exp)
        }
      })
    }

    console.log(`[Quality] Chaos Mode ${config.enabled ? 'enabled' : 'disabled'}`)
    return { success: true }
  })

  // Quality Assurance - Metrics
  ipcMain.handle('quality:getMetrics', async () => {
    const recentFailures = qaScorer.getRecentFailures(0.5, 10)

    // Calculate average QA score from all scores
    const scoresMap = (qaScorer as any).scores as Map<string, any>
    const allScores = Array.from(scoresMap.values())
    const avgScore = allScores.length > 0
      ? allScores.reduce((sum: number, s: any) => sum + s.overall, 0) / allScores.length
      : 0

    return {
      averageQAScore: Math.round(avgScore * 100),
      totalScores: allScores.length,
      recentFailures: recentFailures.length,
      failureDetails: recentFailures.map(f => ({
        id: f.outputId,
        score: Math.round(f.overall * 100),
        timestamp: f.timestamp
      }))
    }
  })

  // Quality Assurance - Patterns
  ipcMain.handle('quality:getPatterns', async () => {
    await patternDetector.analyzeFailures()
    const patterns = patternDetector.getPatterns()

    return patterns.map(p => ({
      id: p.id,
      category: p.category,
      description: p.description,
      occurrences: p.occurrences,
      lastSeen: new Date(p.lastSeen).toLocaleString()
    }))
  })

  // Quality Assurance - Playbooks
  ipcMain.handle('quality:getPlaybooks', async () => {
    const playbooks = playbookManager.getAllPlaybooks()

    return playbooks.map(p => ({
      id: p.id,
      title: p.title,
      when: p.when,
      stepsCount: p.steps.length,
      pitfallsCount: p.pitfalls.length,
      updatedAt: new Date(p.updatedAt).toLocaleString()
    }))
  })

  ipcMain.handle('quality:getPlaybookDetails', async (_, id: string) => {
    const playbook = playbookManager.getPlaybook(id)
    return playbook || null
  })

  // =======================
  // Agent Management
  // =======================

  ipcMain.handle('agent:create', async (_event, config: any) => {
    try {
      console.log('[Agents] Creating new agent:', config.name)

      if (!synergyManager) {
        return {
          success: false,
          error: 'Synergy manager not initialized'
        }
      }

      // Core agents that cannot be duplicated
      const coreAgentNames = ['rami', 'coder', 'researcher', 'orchestrator', 'assistant']
      if (coreAgentNames.includes(config.name?.toLowerCase())) {
        return {
          success: false,
          error: 'This name is reserved for core system agents'
        }
      }

      const agent = await synergyManager.createAgent({
        name: config.name,
        role: config.role || 'Specialist',
        department: config.department || 'operations',
        level: config.level || 'senior',
        skills: config.capabilities || config.skills || [],
        personality: config.personality || 'Professional and efficient',
        systemPrompt: config.systemPrompt || `You are ${config.name}, a specialized agent created for specific tasks.`,
      }, 'user')

      console.log('[Agents] Agent created successfully:', agent.id)
      appEvents.emit('agent:created', { agent })

      return {
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          department: agent.department,
          avatar: config.avatar || '🤖',
          isActive: true
        }
      }
    } catch (error: any) {
      console.error('[Agents] Failed to create agent:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to create agent'
      }
    }
  })

  ipcMain.handle('agent:delete', async (_event, agentId: string) => {
    try {
      console.log('[Agents] Attempting to delete agent:', agentId)

      if (!synergyManager) {
        return {
          success: false,
          error: 'Synergy manager not initialized'
        }
      }

      // Prevent deletion of core system agents
      const coreAgentIds = ['rami', 'coder', 'researcher', 'orchestrator', 'assistant']
      const agentToDelete: any = Array.from((synergyManager as any).agents.values()).find((a: any) => a.id === agentId)

      if (!agentToDelete) {
        return {
          success: false,
          error: 'Agent not found'
        }
      }

      // Check if it's a core agent by name
      if (coreAgentIds.some(coreId => agentToDelete.name.toLowerCase().includes(coreId))) {
        return {
          success: false,
          error: 'Cannot delete core system agents'
        }
      }

      // Delete the agent
      ; (synergyManager as any).agents.delete(agentId)
      await (synergyManager as any).saveState()

      console.log('[Agents] Agent deleted successfully:', agentId)
      appEvents.emit('agent:deleted', { agentId })

      return { success: true }
    } catch (error: any) {
      console.error('[Agents] Failed to delete agent:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to delete agent'
      }
    }
  })

  // ========== Automation Handlers ==========

  // Cron Tasks
  ipcMain.handle('cron:list', async () => {
    try {
      return cronManager.getTasks()
    } catch (error: any) {
      console.error('[IPC] cron:list error:', error)
      return []
    }
  })

  ipcMain.handle('cron:create', async (_event, ...args) => {
    try {
      let name, command, type, schedule, timestamp

      if (args.length === 1 && typeof args[0] === 'object') {
        const config = args[0]
        name = config.name
        command = config.command
        schedule = config.schedule
        timestamp = config.timestamp
        type = config.type || (schedule ? 'recurring' : 'one-time')
      } else {
        ;[name, command, type, schedule, timestamp] = args
      }

      const task = await cronManager.addTask(name, command, type, schedule, timestamp)
      appEvents.emit('cron:task_created', { task })
      return task
    } catch (error: any) {
      console.error('[IPC] cron:create error:', error)
      throw error
    }
  })

  ipcMain.handle('cron:delete', async (_event, id: string) => {
    try {
      const result = await cronManager.removeTask(id)
      if (result) {
        appEvents.emit('cron:task_deleted', { id })
      }
      return { success: result }
    } catch (error: any) {
      console.error('[IPC] cron:delete error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cron:toggle', async (_event, id: string, enabled: boolean) => {
    try {
      const result = await cronManager.toggleTask(id, enabled)
      if (result) {
        appEvents.emit('cron:task_toggled', { id, enabled })
      }
      return { success: result }
    } catch (error: any) {
      console.error('[IPC] cron:toggle error:', error)
      return { success: false, error: error.message }
    }
  })

  // Workflows
  ipcMain.handle('workflow:list', async () => {
    try {
      const workflows = workflowEngine.getWorkflows()
      return { success: true, workflows }
    } catch (error: any) {
      console.error('[IPC] workflow:list error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workflow:templates', async () => {
    try {
      const templates = workflowEngine.getTemplates()
      return { success: true, templates }
    } catch (error: any) {
      console.error('[IPC] workflow:templates error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workflow:create', async (_event, config: any) => {
    try {
      console.log('[IPC] Creating workflow:', config.name)
      const workflow = await workflowEngine.createWorkflow(config)
      appEvents.emit('workflow:created', { workflow })
      return { success: true, workflow }
    } catch (error: any) {
      console.error('[IPC] workflow:create error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workflow:run', async (_event, id: string, input: any) => {
    try {
      console.log('[IPC] Running workflow:', id)
      const run = await workflowEngine.runWorkflow(id, input)
      return { success: true, run }
    } catch (error: any) {
      console.error('[IPC] workflow:run error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workflow:delete', async (_event, id: string) => {
    try {
      const result = await workflowEngine.deleteWorkflow(id)
      if (result) {
        appEvents.emit('workflow:deleted', { id })
      }
      return { success: result }
    } catch (error: any) {
      console.error('[IPC] workflow:delete error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workflow:history', async (_event, workflowId?: string) => {
    try {
      const runs = workflowEngine.getRuns(workflowId)
      return { success: true, runs }
    } catch (error: any) {
      console.error('[IPC] workflow:history error:', error)
      return { success: false, error: error.message }
    }
  })



}

// Helper functions for agent UI representation
function getAgentAvatar(name: string): string {
  const avatars: Record<string, string> = {
    'Rami': '🤖',
    'CodeMaster': '👨‍💻',
    'Scholar': '📚',
    'Orchestrator': '📋',
    'CyberGuard': '🛡️',
    'DataScientist': '📊',
    'Designer': '🎨',
    'Writer': '✍️'
  }
  return avatars[name] || '🤖'
}

function getAgentColor(name: string): string {
  const colors: Record<string, string> = {
    'Rami': '#6366f1',
    'CodeMaster': '#10b981',
    'Scholar': '#f59e0b',
    'Orchestrator': '#ec4899',
    'CyberGuard': '#8b5cf6'
  }
  return colors[name] || '#6366f1'
}

app.whenReady().then(async () => {
  // Set app user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.ramibot.app')
  }

  setupIpcHandlers()
  createWindow()
  await initializeServices()

  // Register Global Hotkey
  const settings = await loadSettings()
  if (settings.globalHotkey) {
    registerGlobalHotkey(settings.globalHotkey)
  }

  // Plugin Manager
  // TEMPORARILY DISABLED - causing startup freeze
  console.log('[PluginManager] Initialization disabled temporarily')
  /*
  if (mainWindow) {
    const { PluginManager } = await import('./services/plugin-manager')
    pluginManager = new PluginManager()
    pluginManager.setMainWindow(mainWindow)
    await pluginManager.initialize()
  }
  */

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Cleanup
    telegramBot?.stop()
    localServer?.stop()
    app.quit()
  }
})
