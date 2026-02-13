import express, { Express, Request, Response } from 'express'
import { Server } from 'http'
import { appEvents } from '../events'

export class LocalAPIServer {
  private app: Express
  private server: Server | null = null
  private port: number

  constructor(port: number = 31415) {
    this.port = port
    this.app = express()
    this.setupRoutes()
  }

  private setupRoutes(): void {
    this.app.use(express.json())

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() })
    })

    // Service invoke endpoint
    this.app.post('/api/v1/invoke', (req: Request, res: Response) => {
      const { context, data, serviceId } = req.body

      console.log('[LocalAPI] Invoke from service:', serviceId)
      console.log('[LocalAPI] Context:', context)
      console.log('[LocalAPI] Data:', data)

      // Emit event for processing
      appEvents.emit('service:invoke', { serviceId, context, data })

      res.json({ success: true, received: true })
    })

    // Notification endpoint
    this.app.post('/api/v1/notify', (req: Request, res: Response) => {
      const { message, platform, chatId } = req.body

      console.log('[LocalAPI] Notification request:', { platform, chatId, message })

      appEvents.emit('notification:send', { message, platform, chatId })

      res.json({ success: true })
    })

    // auth callback endpoint for OAuth flow
    this.app.get('/api/v1/auth/callback', (req: Request, res: Response) => {
      const { code, state, error, provider } = req.query

      console.log(`[LocalAPI] OAuth Callback from ${provider}:`, { code, state, error })

      appEvents.emit('auth:callback', {
        provider: provider as string || 'unknown',
        code: code as string,
        state: state as string,
        error: error as string
      })

      res.send(`
        <html>
          <body style="font-family: sans-serif; background: #0f172a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <h1 style="color: #38bdf8;">Authentication ${error ? 'Failed' : 'Successful'}</h1>
              <p>${error ? 'Error: ' + error : 'You can close this window and return to Rami Bot.'}</p>
              <button onclick="window.close()" style="background: #38bdf8; color: #0f172a; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem;">Close Window</button>
            </div>
          </body>
        </html>
      `)
    })
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '127.0.0.1', () => {
          console.log(`[LocalAPI] Server running on http://127.0.0.1:${this.port}`)
          resolve()
        })

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`[LocalAPI] Port ${this.port} already in use`)
            resolve() // Don't fail, maybe another instance is running
          } else {
            reject(error)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[LocalAPI] Server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  public isRunning(): boolean {
    return this.server !== null && this.server !== undefined
  }
}
