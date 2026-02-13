/**
 * Vision Analyzer
 * Advanced vision processing including OCR, object detection, and UI element recognition
 */

import { createWorker } from 'tesseract.js'
import { Jimp } from 'jimp'
// import pixelmatch from 'pixelmatch'
// Lazy load tensorflow to avoid startup crashes if native bindings fail
// import * as tf from '@tensorflow/tfjs-node'
// import * as cocoSsd from '@tensorflow-models/coco-ssd'
import type { ObjectDetection } from '@tensorflow-models/coco-ssd'

import {
    OCRResult,
    ObjectDetectionResult,
    UIElementDetectionResult,
    ImageComparisonResult,
    LayoutAnalysisResult,
    LayoutSection,
    VisionAnalysisRequest,
    VisionAnalysisResult,
    TextBlock,
    DetectedObject,
    UIElement,
    UIElementType,
    BoundingBox,
    ImageDifference,
    StructuralGraph,
    UIElementGroup,
    Relationship
} from './types/vision-types'

/**
 * Vision Analyzer Class
 * Provides advanced image analysis capabilities
 */
export class VisionAnalyzer {
    private objectDetectionModel: ObjectDetection | null = null

    /**
     * Load object detection model
     */
    private async loadModel(): Promise<ObjectDetection> {
        if (!this.objectDetectionModel) {
            console.log('[VisionAnalyzer] Lazy loading TensorFlow and Coco-SSD...')
            try {
                const tf = await import('@tensorflow/tfjs-node')
                const cocoSsd = await import('@tensorflow-models/coco-ssd')
                this.objectDetectionModel = await cocoSsd.load()
            } catch (error: any) {
                console.error('[VisionAnalyzer] Failed to load TensorFlow/Coco-SSD:', error)
                throw new Error('Object detection dependencies failed to load. Please ensure @tensorflow/tfjs-node is correctly installed.')
            }
        }
        return this.objectDetectionModel
    }
    /**
     * Perform OCR (Optical Character Recognition) on an image
     * @param imageData Base64 encoded image
     * @param language Optional language code (e.g., 'eng', 'ara')
     * @returns OCR result with extracted text and confidence
     */
    async performOCR(imageData: string, language: string = 'eng'): Promise<OCRResult> {
        try {
            const worker = await createWorker(language)
            const ret = await worker.recognize(Buffer.from(imageData, 'base64'))
            await worker.terminate()

            const result: OCRResult = {
                success: true,
                text: ret.data.text,
                confidence: ret.data.confidence / 100,
                language: language,
                blocks: ret.data.blocks?.map(block => ({
                    text: block.text,
                    confidence: block.confidence / 100,
                    boundingBox: {
                        x: block.bbox.x0,
                        y: block.bbox.y0,
                        width: block.bbox.x1 - block.bbox.x0,
                        height: block.bbox.y1 - block.bbox.y0
                    }
                })) || []
            }

            return result
        } catch (error: any) {
            console.error('[VisionAnalyzer] OCR failed:', error)
            return {
                success: false,
                text: '',
                confidence: 0,
                blocks: [],
                error: error.message
            }
        }
    }

    /**
     * Detect objects in an image
     * @param imageData Base64 encoded image
     * @returns Detected objects with labels and bounding boxes
     */
    async detectObjects(imageData: string): Promise<ObjectDetectionResult> {
        try {
            const model = await this.loadModel()
            const tf = await import('@tensorflow/tfjs-node')

            const imageBuffer = Buffer.from(imageData, 'base64')
            const tfImage = tf.node.decodeImage(imageBuffer, 3) as any // Cast to any to avoid complex TF types in lazy load
            const predictions = await model.detect(tfImage)
            tf.dispose(tfImage) // Essential for memory management

            const objects: DetectedObject[] = predictions.map(pred => ({
                label: pred.class,
                confidence: pred.score,
                boundingBox: {
                    x: pred.bbox[0],
                    y: pred.bbox[1],
                    width: pred.bbox[2],
                    height: pred.bbox[3]
                },
                category: pred.class
            }))

            return {
                success: true,
                objects: objects,
                totalObjects: objects.length
            }
        } catch (error: any) {
            console.error('[VisionAnalyzer] Object detection failed:', error)
            return {
                success: false,
                objects: [],
                totalObjects: 0,
                error: error.message
            }
        }
    }

    /**
     * Detect UI elements in a screenshot
     * @param imageData Base64 encoded screenshot
     * @returns Detected UI elements with types and positions
     */
    async detectUIElements(imageData: string): Promise<UIElementDetectionResult> {
        try {
            const image = await Jimp.read(Buffer.from(imageData, 'base64'))

            // Simple logic: Use OCR results as basic UI elements
            const ocrResult = await this.performOCR(imageData)
            const elements: UIElement[] = ocrResult.blocks.map(block => ({
                type: block.text.length < 20 ? 'button' : 'text',
                label: block.text,
                boundingBox: block.boundingBox,
                confidence: block.confidence,
                attributes: {},
                isInteractive: block.text.length < 20
            }))

            return {
                success: true,
                elements: elements,
                totalElements: elements.length
            }
        } catch (error: any) {
            console.error('[VisionAnalyzer] UI element detection failed:', error.message)
            return {
                success: false,
                elements: [],
                totalElements: 0,
                error: error.message
            }
        }
    }

    /**
     * Detect document-specific UI elements (PowerPoint, Word, etc.)
     * Enhanced detection for slides, placeholders, buttons
     * @param imageData Base64 encoded screenshot
     * @returns Document-specific UI elements
     */
    async detectDocumentUIElements(imageData: string): Promise<UIElementDetectionResult> {
        try {
            const ocrResult = await this.performOCR(imageData)
            const elements: UIElement[] = []

            // Common document UI patterns
            const buttonPatterns = [
                'new slide', 'insert', 'design', 'transition', 'animations',
                'slide show', 'review', 'view', 'file', 'home', 'save',
                'click to add', 'title', 'subtitle', 'bullet', 'number',
                '+', 'add slide', 'duplicate', 'delete', 'copy', 'paste'
            ]

            for (const block of ocrResult.blocks) {
                const text = block.text.toLowerCase().trim()

                // Classify element type
                let type: UIElementType = 'text'
                let isInteractive = false

                // Check if it's a button or interactive element
                for (const pattern of buttonPatterns) {
                    if (text.includes(pattern) || text === pattern) {
                        type = 'button'
                        isInteractive = true
                        break
                    }
                }

                // Check for placeholders
                if (text.includes('click to add') || text.includes('placeholder')) {
                    type = 'textbox'
                    isInteractive = true
                }

                // Check for slide-related terms
                if (text.match(/^slide\s*\d*$/i) || text === 'slide') {
                    type = 'slide'
                    isInteractive = true
                }

                elements.push({
                    type,
                    label: block.text,
                    boundingBox: block.boundingBox,
                    confidence: block.confidence,
                    attributes: {
                        isPlaceholder: text.includes('click to add'),
                        isSlideNumber: !!text.match(/^slide\s*\d+$/i)
                    },
                    isInteractive
                })
            }

            return {
                success: true,
                elements,
                totalElements: elements.length
            }
        } catch (error: any) {
            console.error('[VisionAnalyzer] Document UI detection failed:', error.message)
            return {
                success: false,
                elements: [],
                totalElements: 0,
                error: error.message
            }
        }
    }

    /**
     * Detect slide thumbnails in a presentation
     * @param imageData Base64 encoded screenshot
     * @returns Detected slide thumbnails
     */
    async detectSlideThumbnails(imageData: string): Promise<UIElementDetectionResult> {
        try {
            const ocrResult = await this.performOCR(imageData)
            const elements: UIElement[] = []

            // Look for slide patterns in the thumbnail pane (usually left side)
            for (const block of ocrResult.blocks) {
                const text = block.text.trim()

                // Slide thumbnail indicators
                const isSlideIndicator = text.match(/^\d+$/) || // Just numbers
                    text.match(/^slide\s*\d+$/i) ||
                    text === 'slide'

                if (isSlideIndicator && block.confidence > 0.5) {
                    elements.push({
                        type: 'slide',
                        label: text,
                        boundingBox: block.boundingBox,
                        confidence: block.confidence,
                        attributes: {
                            isThumbnail: true,
                            slideNumber: parseInt(text.replace(/\D/g, '') || '0')
                        },
                        isInteractive: true
                    })
                }
            }

            return {
                success: true,
                elements,
                totalElements: elements.length
            }
        } catch (error: any) {
            return {
                success: false,
                elements: [],
                totalElements: 0,
                error: error.message
            }
        }
    }

    /**
     * Find text location in image and return bounding box
     * @param imageData Base64 encoded image
     * @param searchText Text to find
     * @returns Bounding boxes of found text instances
     */
    async findTextLocation(imageData: string, searchText: string): Promise<BoundingBox[]> {
        try {
            const ocrResult = await this.performOCR(imageData)
            const lowerSearchText = searchText.toLowerCase()

            const matches = ocrResult.blocks
                .filter(block => block.text.toLowerCase().includes(lowerSearchText))
                .map(block => block.boundingBox)

            return matches
        } catch (error) {
            console.error('[VisionAnalyzer] Find text failed:', error)
            return []
        }
    }

    /**
     * Compare two images and find differences
     * @param image1 Base64 encoded first image
     * @param image2 Base64 encoded second image
     * @returns Comparison result with similarity score and differences
     */
    async compareImages(image1: string, image2: string): Promise<ImageComparisonResult> {
        try {
            const img1 = await Jimp.read(Buffer.from(image1, 'base64'))
            const img2 = await Jimp.read(Buffer.from(image2, 'base64'))

            const { width, height } = img1.bitmap
            if (width !== img2.bitmap.width || height !== img2.bitmap.height) {
                // Resize image 2 to match image 1 if they don't match
                img2.resize({ w: width, h: height })
            }

            const { default: pixelmatch } = await import('pixelmatch')

            const diff = new Jimp({ width, height })
            const numDiffPixels = pixelmatch(
                img1.bitmap.data,
                img2.bitmap.data,
                diff.bitmap.data,
                width,
                height,
                { threshold: 0.1 }
            )

            const similarity = 1 - (numDiffPixels / (width * height))
            const diffBase64 = (await diff.getBuffer('image/png')).toString('base64')

            return {
                success: true,
                similarity: similarity,
                differences: [], // Could implement clustering to find bounding boxes
                totalDifferences: numDiffPixels,
                diffImage: diffBase64
            }
        } catch (error: any) {
            console.error('[VisionAnalyzer] Image comparison failed:', error.message)
            return {
                success: false,
                similarity: 0,
                differences: [],
                totalDifferences: 0,
                error: error.message
            }
        }
    }

    /**
     * Analyze layout structure of a screenshot
     * @param imageData Base64 encoded screenshot
     * @returns Layout analysis with detected regions and structure
     */
    async analyzeLayout(imageData: string): Promise<LayoutAnalysisResult> {
        try {
            const uiElementsResult = await this.detectUIElements(imageData)
            const structuralGraph = await this.analyzeStructuralLayout(uiElementsResult.elements)

            // Simplified layout analysis
            const sections: LayoutSection[] = [
                { type: 'content', boundingBox: { x: 0, y: 0, width: 0, height: 0 }, elements: uiElementsResult.elements }
            ]

            return {
                success: true,
                layout: {
                    type: structuralGraph.groups.length > 5 ? 'grid' : 'single-column',
                    columns: 1,
                    sections: sections
                },
                regions: []
            }
        } catch (error: any) {
            return {
                success: false,
                layout: { type: 'complex', columns: 0, sections: [] },
                regions: [],
                error: error.message
            }
        }
    }

    /**
     * Advanced Semantic UI Analysis: Group recognized elements into a structural graph
     */
    async analyzeStructuralLayout(elements: UIElement[]): Promise<StructuralGraph> {
        const nodes = [...elements]
        const groups: UIElementGroup[] = []
        const relationships: Relationship[] = []

        const processedIds = new Set<string>()

        for (let i = 0; i < elements.length; i++) {
            const el1 = elements[i]
            if (processedIds.has(el1.label || i.toString())) continue

            // Look for "Label-Input" pairs
            if (el1.type === 'text' || el1.type === 'heading') {
                for (let j = 0; j < elements.length; j++) {
                    if (i === j) continue
                    const el2 = elements[j]

                    // Vertical alignment (Label above Input)
                    const isVertical = Math.abs(el1.boundingBox.x - el2.boundingBox.x) < 20 &&
                        el2.boundingBox.y > el1.boundingBox.y &&
                        el2.boundingBox.y - (el1.boundingBox.y + el1.boundingBox.height) < 40

                    // Horizontal alignment (Label left of Input)
                    const isHorizontal = Math.abs(el1.boundingBox.y - el2.boundingBox.y) < 10 &&
                        el2.boundingBox.x > el1.boundingBox.x &&
                        el2.boundingBox.x - (el1.boundingBox.x + el1.boundingBox.width) < 100

                    if (isVertical || isHorizontal) {
                        const groupId = `group_${groups.length}`
                        const group: UIElementGroup = {
                            id: groupId,
                            type: 'form-group',
                            label: el1.label,
                            boundingBox: {
                                x: Math.min(el1.boundingBox.x, el2.boundingBox.x),
                                y: Math.min(el1.boundingBox.y, el2.boundingBox.y),
                                width: Math.max(el1.boundingBox.x + el1.boundingBox.width, el2.boundingBox.x + el2.boundingBox.width) - Math.min(el1.boundingBox.x, el2.boundingBox.x),
                                height: Math.max(el1.boundingBox.y + el1.boundingBox.height, el2.boundingBox.y + el2.boundingBox.height) - Math.min(el1.boundingBox.y, el2.boundingBox.y)
                            },
                            elementIds: [el1.label || i.toString(), el2.label || j.toString()]
                        }

                        groups.push(group)
                        relationships.push({
                            sourceId: el1.label || i.toString(),
                            targetId: el2.label || j.toString(),
                            type: 'label-for'
                        })

                        el1.parentId = groupId
                        el2.parentId = groupId
                    }
                }
            }
        }

        return { nodes, groups, relationships }
    }

    /**
     * Perform comprehensive vision analysis
     * @param request Vision analysis request with image and analysis types
     * @returns Comprehensive analysis result
     */
    async analyze(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
        const startTime = Date.now()

        try {
            const result: VisionAnalysisResult = {
                success: true,
                metadata: {
                    width: 0,
                    height: 0,
                    format: 'png',
                    analyzedAt: Date.now(),
                    processingTime: 0
                }
            }

            // Perform requested analyses
            for (const analysisType of request.analysisTypes) {
                switch (analysisType) {
                    case 'ocr':
                        result.ocr = await this.performOCR(
                            request.imageData,
                            request.options?.language
                        )
                        break
                    case 'objects':
                        result.objects = await this.detectObjects(request.imageData)
                        break
                    case 'ui-elements':
                        result.uiElements = await this.detectUIElements(request.imageData)
                        break
                    case 'layout':
                        const layoutRes = await this.analyzeLayout(request.imageData)
                        result.structuralGraph = await this.analyzeStructuralLayout(result.uiElements?.elements || [])
                        break
                }
            }

            result.metadata.processingTime = Date.now() - startTime

            return result
        } catch (error: any) {
            return {
                success: false,
                metadata: {
                    width: 0,
                    height: 0,
                    format: 'png',
                    analyzedAt: Date.now(),
                    processingTime: Date.now() - startTime
                },
                error: error.message
            }
        }
    }

    /**
     * Extract text from a specific region of an image
     * @param imageData Base64 encoded image
     * @param region Bounding box of the region to extract text from
     * @returns Extracted text
     */
    async extractTextFromRegion(imageData: string, region: BoundingBox): Promise<string> {
        try {
            const image = await Jimp.read(Buffer.from(imageData, 'base64'))
            image.crop({ x: region.x, y: region.y, w: region.width, h: region.height })
            const croppedBuffer = await image.getBuffer('image/png')
            const croppedBase64 = croppedBuffer.toString('base64')

            const ocrResult = await this.performOCR(croppedBase64)
            return ocrResult.text
        } catch (error: any) {
            console.error('[VisionAnalyzer] Region OCR failed:', error.message)
            return ''
        }
    }

    /**
     * Find text in an image and return its location
     * @param imageData Base64 encoded image
     * @param searchText Text to find
     * @returns Bounding boxes of found text instances
     */
    async findText(imageData: string, searchText: string): Promise<BoundingBox[]> {
        try {
            const ocrResult = await this.performOCR(imageData)
            const lowerSearchText = searchText.toLowerCase()

            const matches = ocrResult.blocks
                .filter(block => block.text.toLowerCase().includes(lowerSearchText))
                .map(block => block.boundingBox)

            return matches
        } catch (error) {
            console.error('[VisionAnalyzer] Find text failed:', error)
            return []
        }
    }
}

export const visionAnalyzer = new VisionAnalyzer()
