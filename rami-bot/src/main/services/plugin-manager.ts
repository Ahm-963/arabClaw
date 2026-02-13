import { BrowserWindow, ipcMain, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'

export interface PluginContext {
    window: BrowserWindow
    sendMessage: (text: string, sender?: string) => void
    logger: {
        log: (msg: string) => void
        error: (msg: string) => void
    }
}

export interface PluginManifest {
    id: string
    name: string
    version: string
    description: string
    author: string
    icon?: string
    main: string
}

export interface LoadedPlugin {
    manifest: PluginManifest
    instance: any
    enabled: boolean
    path: string
}

export class PluginManager {
    private plugins: Map<string, LoadedPlugin> = new Map()
    private mainWindow: BrowserWindow | null = null
    private pluginsDir: string

    constructor() {
        this.pluginsDir = path.join(app.getPath('userData'), 'plugins')
    }

    setMainWindow(window: BrowserWindow) {
        this.mainWindow = window
    }

    async initialize() {
        try {
            await fs.mkdir(this.pluginsDir, { recursive: true })
            await this.loadInstalledPlugins()
        } catch (error) {
            console.error('[PluginManager] Init failed:', error)
        }
    }

    async loadInstalledPlugins() {
        try {
            const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true })
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    await this.loadPlugin(path.join(this.pluginsDir, entry.name))
                }
            }
        } catch (error) {
            console.error('[PluginManager] Failed to scan plugins directory:', error)
        }
    }

    async loadPlugin(pluginPath: string): Promise<boolean> {
        try {
            const manifestPath = path.join(pluginPath, 'manifest.json')
            const manifestContent = await fs.readFile(manifestPath, 'utf-8')
            const manifest: PluginManifest = JSON.parse(manifestContent)

            if (this.plugins.has(manifest.id)) {
                console.warn(`[PluginManager] Plugin ${manifest.id} already loaded`)
                return false
            }

            const mainScriptPath = path.join(pluginPath, manifest.main)

            // Dynamic import
            // Note: This is a security risk if loading untrusted code.
            // In production, we should sandbox this.
            const { pathToFileURL } = await import('url')
            const moduleUrl = pathToFileURL(mainScriptPath).href
            const module = await import(moduleUrl)

            const context: PluginContext = {
                window: this.mainWindow!,
                sendMessage: (text, sender) => {
                    this.mainWindow?.webContents.send('message:new', {
                        id: `plugin-${Date.now()}`,
                        text,
                        sender: sender || manifest.name,
                        timestamp: Date.now(),
                        platform: 'plugin'
                    })
                },
                logger: {
                    log: (msg) => console.log(`[Plugin:${manifest.name}] ${msg}`),
                    error: (msg) => console.error(`[Plugin:${manifest.name}] ${msg}`)
                }
            }

            if (module.default && typeof module.default.onLoad === 'function') {
                module.default.onLoad(context)
            }

            this.plugins.set(manifest.id, {
                manifest,
                instance: module.default,
                enabled: true,
                path: pluginPath
            })

            console.log(`[PluginManager] Loaded plugin: ${manifest.name} v${manifest.version}`)
            return true
        } catch (error: any) {
            console.error(`[PluginManager] Failed to load plugin from ${pluginPath}:`, error)
            return false
        }
    }

    async unloadPlugin(pluginId: string): Promise<boolean> {
        const plugin = this.plugins.get(pluginId)
        if (!plugin) return false

        try {
            if (plugin.instance && typeof plugin.instance.onUnload === 'function') {
                plugin.instance.onUnload()
            }
            this.plugins.delete(pluginId)
            console.log(`[PluginManager] Unloaded plugin: ${plugin.manifest.name}`)
            return true
        } catch (error) {
            console.error(`[PluginManager] Error unloading plugin ${pluginId}:`, error)
            return false
        }
    }

    getPlugins() {
        return Array.from(this.plugins.values()).map(p => ({
            ...p.manifest,
            enabled: p.enabled
        }))
    }
}
