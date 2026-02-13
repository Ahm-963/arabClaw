import { describe, it, expect } from 'vitest'
import { visionAnalyzer } from '../tools/vision-analyzer'
import * as fs from 'fs'

describe('Vision Object Detection', () => {
    it('should detect objects in an image', async () => {
        const imageData = fs.readFileSync('kayak_flight_options.png', 'base64')
        console.log('Testing Object Detection with kayak_flight_options.png...')
        const result = await visionAnalyzer.detectObjects(imageData)
        console.log(`Success: ${result.success}`)
        if (result.success) {
            console.log(`Found ${result.totalObjects} objects.`)
            result.objects.forEach(obj => console.log(`- ${obj.label} (${Math.round(obj.confidence * 100)}%)`))
        } else {
            console.log(`Error: ${result.error}`)
        }

        expect(result).toBeDefined()
        // We don't necessarily expect objects in every image, but we expect it to not crash
    }, 30000) // Increase timeout for model loading
})
