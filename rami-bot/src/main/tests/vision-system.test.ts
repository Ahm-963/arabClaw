/**
 * Vision System Tests
 * Verifies OCR, UI recognition, and image comparison
 */

import { describe, it, expect, vi } from 'vitest'

// Mock tesseract.js for environments without Tesseract installed
vi.mock('tesseract.js', () => ({
    createWorker: vi.fn().mockResolvedValue({
        recognize: vi.fn().mockResolvedValue({ 
            data: { text: 'mocked OCR text', confidence: 95 } 
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
    })
}))

import { performOCR, detectUIElements, compareImages } from '../tools/vision'

describe('Vision System Integration', () => {
    // Sample Base64 for a simple image (1x1 transparent pixel)
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

    it('should perform OCR on image', async () => {
        const ocrResult = await performOCR(sampleBase64)
        expect(ocrResult).toBeDefined()
        expect(ocrResult.success).toBe(true)
    })

    it('should detect UI elements', async () => {
        const uiResult = await detectUIElements(sampleBase64)
        expect(uiResult).toBeDefined()
        expect(uiResult.success).toBe(true)
    })

    it('should compare identical images', async () => {
        const compResult = await compareImages(sampleBase64, sampleBase64)
        expect(compResult).toBeDefined()
        expect(compResult.success).toBe(true)
        expect(compResult.similarity).toBe(1)
    })
})
