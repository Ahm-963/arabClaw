import { describe, it, expect } from 'vitest'
import { performOCR } from '../tools/vision'
import { Jimp } from 'jimp'

describe('OCR Verification', () => {
    it('should read text from a real image', async () => {
        const fs = await import('fs')
        if (!fs.existsSync('kayak_flight_options.png')) {
            console.warn('Test image missing, skipping real OCR check.')
            return
        }
        const imageData = fs.readFileSync('kayak_flight_options.png', 'base64')

        console.log('Testing Tesseract.js initialization...')
        const result = await performOCR(imageData)
        console.log(`OCR Result Success: ${result.success}`)
        if (result.error) {
            console.log(`OCR Error: ${result.error}`)
        }

        expect(result).toBeDefined()
        expect(result.success).toBe(true)
    })
})
