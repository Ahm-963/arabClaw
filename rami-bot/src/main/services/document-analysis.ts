
import * as fs from 'fs/promises'
import * as path from 'path'
// const pdf = require('pdf-parse') // Moved to dynamic import
import { app } from 'electron'

export class DocumentAnalysisService {

    async extractText(filePath: string): Promise<string> {
        try {
            const ext = path.extname(filePath).toLowerCase()

            if (ext === '.pdf') {
                const pdfParse = await import('pdf-parse')
                // @ts-ignore - Handle CJS/ESM interop
                const parser = pdfParse.default || pdfParse

                const dataBuffer = await fs.readFile(filePath)
                const data = await parser(dataBuffer)
                return data.text
            } else if (['.txt', '.md', '.json', '.js', '.ts', '.csv', '.log', '.xml', '.yml', '.yaml'].includes(ext)) {
                return await fs.readFile(filePath, 'utf-8')
            } else {
                throw new Error(`Unsupported file type: ${ext}`)
            }
        } catch (error: any) {
            console.error('Error extracting text:', error)
            throw new Error(`Failed to extract text: ${error.message}`)
        }
    }

    async analyze(filePath: string, prompt: string, llmAgent: any): Promise<string> {
        const text = await this.extractText(filePath)

        // Truncate if too long (simple heuristic for now)
        const truncatedText = text.substring(0, 50000)

        const analysisPrompt = `${prompt}\n\nDOCUMENT CONTENT:\n${truncatedText}`

        return await llmAgent.processMessage(analysisPrompt, 'doc_analysis', 'analysis')
    }
}

export const documentAnalysisService = new DocumentAnalysisService()
