/**
 * Vision Tools
 * Screenshot capture, clipboard image handling, and vision analysis
 */

const screenshot = require('screenshot-desktop')
import { clipboard, nativeImage } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { Jimp } from 'jimp'
import { visionAnalyzer } from './vision-analyzer'
import {
    VisionResult,
    ScreenshotOptions,
    VisionAnalysisRequest,
    VisionAnalysisResult
} from './types/vision-types'

/**
 * Take a screenshot with optional region and display selection
 * @param options Screenshot options (region, display, format)
 * @returns Vision result with base64 image data
 */
export async function takeScreenshot(options?: ScreenshotOptions): Promise<VisionResult> {
    try {
        const displays = await screenshot.listDisplays()

        // Prepare screenshot options
        const screenshotOpts: any = {
            format: options?.format || 'png'
        }

        // Select specific display if requested
        if (options?.displayId !== undefined) {
            screenshotOpts.screen = options.displayId
        }

        // Take screenshot
        const imgBuffer = await screenshot(screenshotOpts)

        // If region is specified, crop the image
        let finalBuffer = imgBuffer
        if (options?.region) {
            const image = await Jimp.read(imgBuffer)
            image.crop({
                x: options.region.x,
                y: options.region.y,
                w: options.region.width,
                h: options.region.height
            })
            finalBuffer = await image.getBuffer('image/png' as any)
        }

        // Convert to base64
        const base64 = finalBuffer.toString('base64')

        // Get actual dimensions
        const finalImage = await Jimp.read(finalBuffer)

        return {
            success: true,
            data: base64,
            width: finalImage.bitmap.width,
            height: finalImage.bitmap.height,
            format: options?.format || 'png',
            timestamp: Date.now()
        }
    } catch (error: any) {
        console.error('[Vision] Screenshot failed:', error)
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        }
    }
}

/**
 * Get image from clipboard
 * @returns Vision result with clipboard image data
 */
export async function getClipboardImage(): Promise<VisionResult> {
    try {
        const image = clipboard.readImage()

        if (image.isEmpty()) {
            return {
                success: false,
                error: 'No image in clipboard',
                timestamp: Date.now()
            }
        }

        const size = image.getSize()
        const buffer = image.toPNG()

        return {
            success: true,
            data: buffer.toString('base64'),
            width: size.width,
            height: size.height,
            format: 'png',
            timestamp: Date.now()
        }
    } catch (error: any) {
        console.error('[Vision] Clipboard read failed:', error)
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        }
    }
}

/**
 * Save image to disk
 * @param base64Data Base64 encoded image data
 * @param filename Filename to save as
 * @returns Path to saved file
 */
export async function saveImage(base64Data: string, filename: string): Promise<string> {
    const imagesDir = path.join(app.getPath('userData'), 'images')
    await fs.mkdir(imagesDir, { recursive: true })

    const buffer = Buffer.from(base64Data, 'base64')
    const filePath = path.join(imagesDir, filename)

    await fs.writeFile(filePath, buffer)
    return filePath
}

/**
 * Get list of available displays for multi-monitor support
 * @returns Array of display IDs
 */
export async function getDisplays(): Promise<number[]> {
    try {
        const displays = await screenshot.listDisplays()
        return displays.map((_: any, index: number) => index)
    } catch (error) {
        console.error('[Vision] Failed to list displays:', error)
        return [0] // Return primary display as fallback
    }
}

/**
 * Perform vision analysis on an image
 * @param request Vision analysis request
 * @returns Comprehensive vision analysis result
 */
export async function analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    return await visionAnalyzer.analyze(request)
}

/**
 * Perform OCR on an image
 * @param imageData Base64 encoded image
 * @param language Optional language code
 * @returns OCR result with extracted text
 */
export async function performOCR(imageData: string, language?: string) {
    return await visionAnalyzer.performOCR(imageData, language)
}

/**
 * Detect UI elements in a screenshot
 * @param imageData Base64 encoded screenshot
 * @returns Detected UI elements
 */
export async function detectUIElements(imageData: string) {
    return await visionAnalyzer.detectUIElements(imageData)
}

/**
 * Compare two images
 * @param image1 Base64 encoded first image
 * @param image2 Base64 encoded second image
 * @returns Image comparison result
 */
export async function compareImages(image1: string, image2: string) {
    return await visionAnalyzer.compareImages(image1, image2)
}

/**
 * Perform visual grounding to find coordinates of a UI element
 * @param description Natural language description of the element
 * @param context Additional context
 */
export async function performVisualGrounding(description: string, context?: string): Promise<{ success: boolean; x?: number; y?: number; error?: string }> {
    try {
        console.log(`[Vision] Grounding request: ${description}`)

        // 1. Take a screenshot of the primary display
        const screenshotResult = await takeScreenshot()
        if (!screenshotResult.success || !screenshotResult.data) {
            throw new Error(`Screenshot failed: ${screenshotResult.error}`)
        }

        // 2. Prepare the prompt for the VLM
        // We'll use a specialized prompt to get exact coordinates
        const prompt = `
            Identify the precise (X, Y) coordinates of the following element on the provided screen image:
            ELEMENT: "${description}"
            ${context ? `CONTEXT: ${context}` : ''}

            IMPORTANT:
            - The image size is ${screenshotResult.width}x${screenshotResult.height} pixels.
            - Respond ONLY with a JSON object in this format: {"x": integer, "y": integer, "reasoning": "short description"}
            - The (X, Y) coordinates should be the center of the element.
            - (0,0) is the top-left corner.
        `

        // 3. Call Gemini (VLM) for grounding
        // Note: In a real production swarm, we'd use the settingsManager to get the preferred provider
        // 3. Call VLM for grounding
        const { LLMAgent } = await import('../llm/llm-agent')
        const agent = new LLMAgent()

        // processMessage handles provider switching and vision payloads automatically
        const response = await agent.processMessage(
            prompt,
            'grounding_specialist',
            'internal',
            [screenshotResult.data] // Pass images as base64 array
        )

        // 4. Parse response
        try {
            const cleanJson = response.replace(/```json|```/g, '').trim()
            const result = JSON.parse(cleanJson)
            if (result.x !== undefined && result.y !== undefined) {
                return { success: true, x: result.x, y: result.y }
            }
            throw new Error('Coordinates missing in VLM response')
        } catch (e) {
            console.error('[Vision] Failed to parse VLM response:', response)
            throw new Error('Could not extract coordinates from VLM response')
        }

    } catch (error: any) {
        console.error('[Vision] Grounding failed:', error)
        return { success: false, error: error.message }
    }
}
