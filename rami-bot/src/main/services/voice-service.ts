
import fetch from 'node-fetch'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { settingsManager } from '../settings'

export interface Voice {
    voice_id: string
    name: string
    category?: string
    preview_url?: string
}

export class VoiceService {
    private tempDir: string

    constructor() {
        this.tempDir = path.join(app.getPath('userData'), 'temp_audio')
    }

    async initialize() {
        await fs.mkdir(this.tempDir, { recursive: true })
    }

    private getApiKey(): string | undefined {
        const config = settingsManager.getSettingsSync()
        return config.elevenLabsApiKey
    }

    async getVoices(): Promise<Voice[]> {
        const apiKey = this.getApiKey()
        if (!apiKey) return []

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': apiKey
                }
            })

            if (!response.ok) {
                console.error('[VoiceService] Failed to fetch voices:', response.statusText)
                return []
            }

            const data = await response.json() as any
            return data.voices.map((v: any) => ({
                voice_id: v.voice_id,
                name: v.name,
                category: v.category,
                preview_url: v.preview_url
            }))
        } catch (error) {
            console.error('[VoiceService] Error fetching voices:', error)
            return []
        }
    }

    async textToSpeech(text: string, voiceId?: string): Promise<{ audioData: string; format: string }> {
        const apiKey = this.getApiKey()
        if (!apiKey) throw new Error('ElevenLabs API Key not configured')

        // Default voice (Rachel) if none provided
        const effectiveVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${effectiveVoiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`ElevenLabs API Error: ${error}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const base64 = buffer.toString('base64')

            return {
                audioData: base64,
                format: 'audio/mpeg'
            }

        } catch (error) {
            console.error('[VoiceService] TTS Error:', error)
            throw error
        }
    }

    async saveAudioToFile(text: string, filePath: string, voiceId?: string): Promise<void> {
        const result = await this.textToSpeech(text, voiceId)
        await fs.writeFile(filePath, Buffer.from(result.audioData, 'base64'))
    }
}

export const voiceService = new VoiceService()
