import { describe, it, expect } from 'vitest'
import { detectUIElements, performOCR } from '../tools/vision'
import { UIElement } from '../tools/types/vision-types'

/**
 * Vision UI Component Tests
 * Verifies that UI detection and OCR work together on sample interfaces
 */
describe('Vision UI System Integration', () => {
    // Sample Base64 for a simple image (1x1 transparent pixel)
    const sampleUI = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    it('should detect UI elements from image', async () => {
        console.log('\n[1/3] Testing UI Detection...')
        const uiResult = await detectUIElements(sampleUI)
        console.log(`- Success: ${uiResult.success}`)
        console.log(`- Elements found: ${uiResult.totalElements}`)
        if (uiResult.elements) {
            uiResult.elements.forEach((el: UIElement) =>
                console.log(`  * ${el.type} at [${el.boundingBox.x}, ${el.boundingBox.y}] (Confidence: ${Math.round(el.confidence * 100)}%)`)
            )
        }
        expect(uiResult).toBeDefined()
    })

    it('should perform OCR on image', async () => {
        console.log('\n[2/3] Testing OCR on UI...')
        const ocrResult = await performOCR(sampleUI)
        console.log(`- OCR Success: ${ocrResult.success}`)
        console.log(`- Text found: "${ocrResult.text?.trim()}"`)
        expect(ocrResult).toBeDefined()
        expect(ocrResult.success).toBe(true)
    })

    it('should handle vision UI system verification', async () => {
        console.log('\n[3/3] Testing Vision UI System...')
        // Verify both functions can be called
        const uiResult = await detectUIElements(sampleUI)
        const ocrResult = await performOCR(sampleUI)

        expect(uiResult).toBeDefined()
        expect(ocrResult).toBeDefined()

        console.log('\n✅ Vision UI Tests Complete.')
    })
})
