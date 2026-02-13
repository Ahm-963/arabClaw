/**
 * Vision System Tests
 * Verifies OCR, UI recognition, and image comparison
 */

import { describe, it, expect } from 'vitest'
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
