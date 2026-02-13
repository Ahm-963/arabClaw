/**
 * Vision System Type Definitions
 * Comprehensive types for visual analysis, OCR, object detection, and UI recognition
 */

// Base vision result interface
export interface VisionResult {
    success: boolean
    data?: string // Base64 image
    error?: string
    width?: number
    height?: number
    format?: 'png' | 'jpeg' | 'webp'
    timestamp: number
}

// OCR (Optical Character Recognition) Types
export interface OCRResult {
    success: boolean
    text: string
    confidence: number // 0-1
    language?: string
    blocks: TextBlock[]
    error?: string
}

export interface TextBlock {
    text: string
    confidence: number
    boundingBox: BoundingBox
    language?: string
}

export interface BoundingBox {
    x: number
    y: number
    width: number
    height: number
}

// Object Detection Types
export interface ObjectDetectionResult {
    success: boolean
    objects: DetectedObject[]
    totalObjects: number
    error?: string
}

export interface DetectedObject {
    label: string
    confidence: number
    boundingBox: BoundingBox
    category?: string
}

// UI Element Detection Types
export interface UIElementDetectionResult {
    success: boolean
    elements: UIElement[]
    totalElements: number
    error?: string
}

export interface UIElement {
    type: UIElementType
    label?: string
    boundingBox: BoundingBox
    confidence: number
    attributes: Record<string, any>
    isInteractive: boolean
    parentId?: string // For structural grouping
}

export type UIElementType =
    | 'button'
    | 'input'
    | 'textarea'
    | 'textbox'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'link'
    | 'image'
    | 'text'
    | 'heading'
    | 'icon'
    | 'menu'
    | 'dialog'
    | 'slide'
    | 'panel'
    | 'unknown'

// Image Comparison Types
export interface ImageComparisonResult {
    success: boolean
    similarity: number // 0-1, where 1 is identical
    differences: ImageDifference[]
    totalDifferences: number
    diffImage?: string // Base64 encoded diff visualization
    error?: string
}

export interface ImageDifference {
    type: 'added' | 'removed' | 'modified'
    boundingBox: BoundingBox
    severity: 'low' | 'medium' | 'high'
    description?: string
}

// Screenshot Options
export interface ScreenshotOptions {
    displayId?: number // For multi-monitor
    region?: {
        x: number
        y: number
        width: number
        height: number
    }
    format?: 'png' | 'jpeg' | 'webp'
    quality?: number // 0-100 for jpeg/webp
}

// Vision Analysis Request
export interface VisionAnalysisRequest {
    imageData: string // Base64
    analysisTypes: VisionAnalysisType[]
    options?: VisionAnalysisOptions
}

export type VisionAnalysisType = 'ocr' | 'objects' | 'ui-elements' | 'layout'

export interface VisionAnalysisOptions {
    language?: string // For OCR
    minConfidence?: number // Filter results by confidence
    detectLanguage?: boolean // Auto-detect language for OCR
}

// Comprehensive Vision Analysis Result
export interface VisionAnalysisResult {
    success: boolean
    ocr?: OCRResult
    objects?: ObjectDetectionResult
    uiElements?: UIElementDetectionResult
    structuralGraph?: StructuralGraph
    metadata: {
        width: number
        height: number
        format: string
        analyzedAt: number
        processingTime: number // milliseconds
    }
    error?: string
}

// Layout Analysis Types
export interface LayoutAnalysisResult {
    success: boolean
    layout: LayoutStructure
    regions: LayoutRegion[]
    error?: string
}

export interface LayoutStructure {
    type: 'single-column' | 'multi-column' | 'grid' | 'complex'
    columns: number
    sections: LayoutSection[]
}

export interface LayoutSection {
    type: 'header' | 'footer' | 'sidebar' | 'content' | 'navigation'
    boundingBox: BoundingBox
    elements: UIElement[]
}

export interface LayoutRegion {
    id: string
    type: string
    boundingBox: BoundingBox
    children: LayoutRegion[]
}

// Structural Graph for Semantic UI Analysis
export interface StructuralGraph {
    nodes: UIElement[]
    groups: UIElementGroup[]
    relationships: Relationship[]
}

export interface UIElementGroup {
    id: string
    type: 'form-group' | 'nav-section' | 'list-item' | 'logical-container'
    label?: string // e.g., the label for an input group
    boundingBox: BoundingBox
    elementIds: string[]
}

export interface Relationship {
    sourceId: string
    targetId: string
    type: 'label-for' | 'contains' | 'adjacent-to' | 'belongs-to'
}

// Screen Recording Types
export interface ScreenRecordingOptions {
    displayId?: number
    fps?: number // Frames per second
    duration?: number // Max duration in seconds
    region?: {
        x: number
        y: number
        width: number
        height: number
    }
}

export interface ScreenRecordingResult {
    success: boolean
    filePath?: string
    duration?: number
    frameCount?: number
    error?: string
}
