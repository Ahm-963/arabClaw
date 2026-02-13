import { describe, it, expect, vi } from 'vitest'
import { toolExecutor } from '../tools/tool-executor'
import * as media from '../tools/media'
import * as voice from '../tools/voice'

// Mock media and voice
vi.mock('../tools/media', () => ({
    mediaPlayPause: vi.fn().mockResolvedValue({ success: true }),
    mediaNext: vi.fn().mockResolvedValue({ success: true }),
    mediaPrevious: vi.fn().mockResolvedValue({ success: true }),
    setVolume: vi.fn().mockResolvedValue({ success: true }),
    setBrightness: vi.fn().mockResolvedValue({ success: true }),
    lock: vi.fn().mockResolvedValue({ success: true }),
    sleep: vi.fn().mockResolvedValue({ success: true })
}))

vi.mock('../tools/voice', () => ({
    speak: vi.fn().mockResolvedValue({ success: true }),
    listen: vi.fn().mockResolvedValue({ success: true, text: 'heard you' }),
    getVoices: vi.fn().mockResolvedValue([{ name: 'Voice1' }]),
    speakToFile: vi.fn().mockResolvedValue({ success: true, path: 'out.mp3' })
}))

describe('Media & Voice Tools Integration', () => {

    it('should expose media_play_pause', async () => {
        const result = await toolExecutor.executeTool('media_play_pause', {})
        expect(result).toEqual({ success: true })
        expect(media.mediaPlayPause).toHaveBeenCalled()
    })

    it('should expose set_volume', async () => {
        await toolExecutor.executeTool('set_volume', { level: 50 })
        expect(media.setVolume).toHaveBeenCalledWith(50)
    })

    it('should expose speak', async () => {
        const result = await toolExecutor.executeTool('speak', { text: 'Hello world' })
        expect(result).toEqual({ success: true })
        expect(voice.speak).toHaveBeenCalledWith('Hello world', undefined)
    })

    it('should expose listen', async () => {
        const result = await toolExecutor.executeTool('listen', { duration: 5000 })
        expect(result).toEqual({ success: true, text: 'heard you' })
        expect(voice.listen).toHaveBeenCalledWith(5000)
    })
})
