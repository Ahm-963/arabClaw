import { memoryManager, Memory } from './memory-manager'
import { vectorStore } from './vector-store'

/**
 * Memory Summarizer
 * Condenses old memories to reduce storage and improve retrieval
 */

export class MemorySummarizer {
    private readonly MIN_MEMORIES_TO_SUMMARIZE = 10
    private readonly SIMILARITY_THRESHOLD = 0.7

    /**
     * Summarize memories by topic
     */
    async summarizeByTopic(): Promise<number> {
        const allMemories = await memoryManager.getAllMemories()

        // Group by category
        const grouped = new Map<string, Memory[]>()
        for (const mem of allMemories) {
            const category = mem.category || 'general'
            if (!grouped.has(category)) {
                grouped.set(category, [])
            }
            grouped.get(category)!.push(mem)
        }

        let summarized = 0

        // Summarize each category
        for (const [category, memories] of grouped.entries()) {
            if (memories.length < this.MIN_MEMORIES_TO_SUMMARIZE) continue

            // Find clusters using vector similarity
            const clusters = await this.clusterMemories(memories)

            for (const cluster of clusters) {
                if (cluster.length >= 3) {
                    await this.summarizeCluster(cluster, category)
                    summarized += cluster.length
                }
            }
        }

        console.log(`[Summarizer] Summarized ${summarized} memories`)
        return summarized
    }

    /**
     * Cluster memories by semantic similarity
     */
    private async clusterMemories(memories: Memory[]): Promise<Memory[][]> {
        const clusters: Memory[][] = []
        const visited = new Set<string>()

        for (const mem of memories) {
            if (visited.has(mem.id)) continue

            const cluster: Memory[] = [mem]
            visited.add(mem.id)

            // Find similar memories
            const similar = await vectorStore.search(mem.content, {
                limit: 10,
                threshold: this.SIMILARITY_THRESHOLD
            })

            for (const result of similar) {
                const similarMem = memories.find(m => m.id === result.metadata?.id)
                if (similarMem && !visited.has(similarMem.id)) {
                    cluster.push(similarMem)
                    visited.add(similarMem.id)
                }
            }

            if (cluster.length > 1) {
                clusters.push(cluster)
            }
        }

        return clusters
    }

    /**
     * Summarize a cluster of similar memories
     */
    private async summarizeCluster(cluster: Memory[], category: string): Promise<void> {
        // Create summary content
        const contents = cluster.map(m => m.content).join(' | ')
        const summary = `Summary of ${cluster.length} related memories: ${contents.substring(0, 500)}...`

        // Create summary memory
        const summaryMemory = await memoryManager.remember({
            type: 'learning',
            category,
            content: summary,
            tags: ['summary', 'auto-generated'],
            source: 'self',
            confidence: 0.8,
            context: `Summarized ${cluster.length} memories on ${new Date().toISOString()}`
        })

        // Mark original memories as superseded
        for (const mem of cluster) {
            const updated = { ...mem, tags: [...mem.tags, 'superseded'] }
            await memoryManager.updateMemory(mem.id, updated)
        }

        console.log(`[Summarizer] Created summary: ${summaryMemory.id}`)
    }

    /**
     * Schedule weekly summarization job
     */
    startWeeklySummarization(): void {
        const WEEK_MS = 7 * 24 * 60 * 60 * 1000

        setInterval(async () => {
            console.log('[Summarizer] Running weekly summarization...')
            await this.summarizeByTopic()
        }, WEEK_MS)

        console.log('[Summarizer] Weekly summarization scheduled')
    }
}

export const memorySummarizer = new MemorySummarizer()
