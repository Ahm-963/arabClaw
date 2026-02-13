import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import OpenAI from 'openai'
import { settingsManager } from '../settings'

export interface VectorDocument {
    id: string
    text: string
    embedding: number[]
    metadata: Record<string, any>
    createdAt: number
}

export class SimpleVectorStore {
    private vectors: VectorDocument[] = []
    private dataPath: string
    private openai: OpenAI | null = null
    private initialized = false

    constructor() {
        this.dataPath = path.join(app?.getPath('userData') || '.', 'learning', 'vectors.json')
    }

    async initialize() {
        if (this.initialized) return

        try {
            await this.loadVectors()
            this.initialized = true
            console.log(`[VectorStore] Initialized with ${this.vectors.length} vectors`)
        } catch (error) {
            console.error('[VectorStore] Init error:', error)
        }
    }

    private getOpenAIClient(): OpenAI | null {
        if (this.openai) return this.openai

        const config = settingsManager.getEffectiveLLMConfig()
        // We specifically need OpenAI for embeddings, or a compatible endpoint
        // If the main provider is not OpenAI, we might need a separate key for embeddings
        // For now, we'll try to use the configured OpenAI key from settings
        const settings = settingsManager.getSettingsSync() // We need a way to access settings synch or async

        // HACK: We should probably pass settings or have a better way to get the client
        // For now, let's assume if OpenAI is configured, we use it.
        // If not, we might fail or need a fallback.

        if (settings?.openaiApiKey) {
            this.openai = new OpenAI({
                apiKey: settings.openaiApiKey,
                baseURL: settings.openaiBaseUrl || undefined
            })
            return this.openai
        }

        return null
    }

    async addDocument(text: string, metadata: Record<string, any> = {}): Promise<VectorDocument | null> {
        const client = this.getOpenAIClient()
        if (!client) {
            console.warn('[VectorStore] OpenAI client not available for embeddings')
            return null
        }

        try {
            const response = await client.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                encoding_format: 'float'
            })

            const embedding = response.data[0].embedding

            const doc: VectorDocument = {
                id: `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text,
                embedding,
                metadata,
                createdAt: Date.now()
            }

            this.vectors.push(doc)
            await this.saveVectors()
            return doc

        } catch (error) {
            console.error('[VectorStore] Failed to generate embedding:', error)
            return null
        }
    }

    async search(query: string, limitOrOptions?: number | { limit?: number; threshold?: number }): Promise<{ id: string; score: number; metadata?: any }[]> {
        const client = this.getOpenAIClient()
        if (!client) {
            console.warn('[VectorStore] OpenAI client not available for search')
            return []
        }

        try {
            // Parse options
            const options = typeof limitOrOptions === 'number'
                ? { limit: limitOrOptions }
                : (limitOrOptions || {})

            const limit = options.limit || 5
            const threshold = options.threshold || 0.3

            // Generate query embedding
            const response = await client.embeddings.create({
                model: 'text-embedding-3-small',
                input: query,
                encoding_format: 'float'
            })
            const queryEmbedding = response.data[0].embedding

            // Calculate cosine similarity
            const scores: { id: string; score: number; metadata?: any }[] = []

            for (const doc of this.vectors) {
                const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding)
                if (similarity >= threshold) {
                    scores.push({ id: doc.id, score: similarity, metadata: doc.metadata })
                }
            }

            // Sort and limit
            scores.sort((a, b) => b.score - a.score)
            return scores.slice(0, limit)

        } catch (error) {
            console.error('[VectorStore] Search failed:', error)
            return []
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0
        let normA = 0
        let normB = 0
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i]
            normA += vecA[i] * vecA[i]
            normB += vecB[i] * vecB[i]
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    }

    private async loadVectors() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf-8')
            this.vectors = JSON.parse(data)
        } catch (e) {
            // File might not exist
            this.vectors = []
        }
    }

    private async saveVectors() {
        await fs.writeFile(this.dataPath, JSON.stringify(this.vectors, null, 2))
    }

    async getStats() {
        return {
            totalVectors: this.vectors.length,
            approximateSizeBase64: JSON.stringify(this.vectors).length,
            initialized: this.initialized
        }
    }
}

export const vectorStore = new SimpleVectorStore()
