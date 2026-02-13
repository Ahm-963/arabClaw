import express, { Express } from 'express'
// @ts-ignore
import cors from 'cors'
import path from 'path'
import ip from 'ip'
import { app, BrowserWindow, ipcMain } from 'electron'

export class RemoteServer {
    private app: Express | null = null
    public server: any = null
    private port: number = 3000
    private mainWindow: BrowserWindow | null = null
    private synergyManager: any = null

    constructor(window: BrowserWindow, synergyManager: any) {
        this.mainWindow = window
        this.synergyManager = synergyManager
    }

    async start(port: number = 3000): Promise<{ success: boolean; url?: string; error?: string }> {
        if (this.server) {
            await this.stop()
        }

        this.port = port
        this.app = express()

        try {
            // Middleware
            this.app.use(cors())
            this.app.use(express.json())

            // Register Static Files (Mobile App)
            const mobilePath = app.isPackaged
                ? path.join(process.resourcesPath, 'mobile')
                : path.join(__dirname, '../../src/renderer/public/mobile')

            console.log('[RemoteServer] Serving mobile app from:', mobilePath)
            this.app.use(express.static(mobilePath))

            // API Endpoints
            this.registerRoutes()

            // Start listening
            return new Promise((resolve) => {
                this.server = this.app!.listen(this.port, '0.0.0.0', () => {
                    try {
                        const localIp = ip.address()
                        const url = `http://${localIp}:${this.port}`
                        console.log(`[RemoteServer] Running at ${url}`)
                        resolve({ success: true, url })
                    } catch (err: any) {
                        console.error('[RemoteServer] IP detection failed:', err)
                        resolve({ success: true, url: `http://localhost:${this.port}` })
                    }
                })

                this.server.on('error', (err: any) => {
                    console.error('[RemoteServer] Start error:', err)
                    resolve({ success: false, error: err.message })
                })
            })

        } catch (error: any) {
            console.error('[RemoteServer] Setup error:', error)
            return { success: false, error: error.message }
        }
    }

    async stop(): Promise<boolean> {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('[RemoteServer] Stopped')
                    this.server = null
                    this.app = null
                    resolve(true)
                })
            })
        }
        return true
    }

    public isRunning(): boolean {
        return this.server !== null && this.server !== undefined
    }

    private registerRoutes() {
        if (!this.app) return

        // Health Check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', version: app.getVersion() })
        })

        // Send Message to Bot
        this.app.post('/api/message', async (req, res) => {
            const { text, sender } = req.body
            if (!this.mainWindow) {
                return res.status(503).json({ error: 'Host not ready' })
            }

            // Forward to renderer/main processing
            this.mainWindow.webContents.send('remote:message-received', { text, sender })

            // Process via Synergy/Agent if available
            let response = 'Message received'
            if (this.synergyManager) {
                // simple loopback for now, or trigger actual agent processing
            }

            res.json({ success: true, response })
        })

        // Execute Command
        this.app.post('/api/command', async (req, res) => {
            const { command } = req.body // e.g., 'stop_speaking', 'shutdown'

            if (command === 'stop_speaking') {
                this.mainWindow?.webContents.send('voice:stop')
            }

            res.json({ success: true })
        })

        // Get Status
        this.app.get('/api/status', async (req, res) => {
            res.json({
                app: 'RamiBot',
                uptime: process.uptime(),
                isSpeaking: false // Todo: hook into voice state
            })
        })
    }
}
