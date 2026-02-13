import axios from 'axios'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'
import { settingsManager } from '../settings'

export interface ElevenLabsVoice {
    voice_id: string
    name: string
    category: string
    labels?: Record<string, string>
    preview_url?: string
}

export class ElevenLabsService {
    private displayVoices: ElevenLabsVoice[] = []
    private cachePath: string
    private initialized = false

    constructor() {
        this.cachePath = path.join(app?.getPath('userData') || os.tmpdir(), 'voice_cache')
    }

    async initialize() {
        if (this.initialized) return
        try {
            await fs.mkdir(this.cachePath, { recursive: true })
            this.initialized = true
        } catch (e) {
            console.error('[ElevenLabs] Init cache error:', e)
        }
    }

    private getApiKey(): string {
        const settings = settingsManager.getSettingsSync()
        return settings.elevenLabsApiKey || ''
    }

    async getVoices(): Promise<ElevenLabsVoice[]> {
        const apiKey = this.getApiKey()
        if (!apiKey) return []

        if (this.displayVoices.length > 0) return this.displayVoices

        try {
            const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': apiKey
                }
            })

            if (response.data && response.data.voices) {
                this.displayVoices = response.data.voices.map((v: any) => ({
                    voice_id: v.voice_id,
                    name: v.name,
                    category: v.category,
                    labels: v.labels,
                    preview_url: v.preview_url
                }))
                return this.displayVoices
            }
        } catch (error: any) {
            console.error('[ElevenLabs] Get Voices Error:', error.message)
        }
        return []
    }

    async textToSpeech(text: string, voiceId: string): Promise<string | null> {
        const apiKey = this.getApiKey()
        if (!apiKey) {
            console.warn('[ElevenLabs] No API Key')
            return null
        }

        await this.initialize()

        // Create a cache key based on text and voice
        const safeText = text.slice(0, 50).replace(/[^a-z0-9]/gi, '_')
        const cacheKey = `${voiceId}_${safeText}_${Date.now()}.mp3`
        const filePath = path.join(this.cachePath, cacheKey)

        try {
            const response = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    text,
                    model_id: 'eleven_monolingual_v1', // or eleven_multilingual_v2
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                },
                {
                    headers: {
                        'xi-api-key': apiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'arraybuffer'
                }
            )

            await fs.writeFile(filePath, response.data)
            return filePath
        } catch (error: any) {
            console.error('[ElevenLabs] TTS Error:', error.message)
            if (error.response) {
                console.error('[ElevenLabs] details:', error.response.status, error.response.data?.toString())
            }
            return null
        }
    }
}

export const elevenLabsService = new ElevenLabsService()
