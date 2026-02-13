import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { settingsManager, loadSettings, saveSettings } from './settings'
import { appEvents } from './events'
import { TelegramBot } from './platforms/telegram'
import { ServiceManager } from './services/service-manager'
import { LocalAPIServer } from './api/local-server'
import { executeCommand } from './tools/bash'
import { fileEditor } from './tools/file-editor'
import { webSearch } from './tools/web-search'
import { downloadFile } from './tools/download'
import { ClaudeAgent } from './llm/agent'

let mainWindow: BrowserWindow | null = null
let telegramBot: TelegramBot | null = null
let serviceManager: ServiceManager | null = null
let localServer: LocalAPIServer | null = null
let claudeAgent: ClaudeAgent | null = null

function createWindow(): void {
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
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Initialize services
async function initializeServices(): Promise<void> {
  console.log('[Main] Initializing services...')
  
  // Initialize settings
  await settingsManager.initialize()
  const settings = await loadSettings()
  
  // Initialize Claude Agent
  claudeAgent = new ClaudeAgent()
  
  // Initialize Telegram Bot
  if (settings.telegramBotToken && settings.telegramAutoConnect) {
    telegramBot = new TelegramBot(settings.telegramBotToken)
    await telegramBot.start()
  }
  
  // Initialize Service Manager
  serviceManager = new ServiceManager()
  await serviceManager.initialize()
  
  // Initialize Local API Server
  localServer = new LocalAPIServer(31415)
  await localServer.start()
  
  console.log('[Main] Services initialized')
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
    
    return true
  })
  
  // Telegram
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
  
  ipcMain.handle('tools:download', async (_, url: string, filename?: string, outputDir?: string) => {
    return await downloadFile(url, filename, outputDir)
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
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.ramibot.app')
  
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
  setupIpcHandlers()
  createWindow()
  await initializeServices()
  
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
