import { describe, it, expect } from 'vitest'
import { performOCR, detectUIElements, compareImages } from '../tools/vision'

describe('Vision System Integration', () => {
    // 1x1 Transparent PNG Pixel
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

    // 100x50 Blue Box (base64)
    const blueBoxBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqNX6DAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gYFFCYiG0o2ZAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAABRSURBVGje7cwxAQAADMOg+Te9K+YBAxLInG7mEiRIkCBBgv8fJUiQIEnfJUiQIEmSJEmSIEGSDkiQIEGCBAkSJEiQIEGCBAkSJEiQIEGCBAlO7XMBgAVf7W0AAAAASUVORK5CYII='

    it('should perform OCR on sample image', async () => {
        const result = await performOCR(sampleBase64)
        expect(result).toBeDefined()
        expect(result.success).toBe(true)
    })

    it('should detect UI elements', async () => {
        const result = await detectUIElements(sampleBase64)
        expect(result).toBeDefined()
        expect(result.success).toBe(true)
        expect(result.elements).toBeDefined()
    })

    it('should compare two identical images', async () => {
        const result = await compareImages(sampleBase64, sampleBase64)
        expect(result.success).toBe(true)
        expect(result.similarity).toBeGreaterThan(0.99)
        expect(result.totalDifferences).toBe(0)
    })
})
