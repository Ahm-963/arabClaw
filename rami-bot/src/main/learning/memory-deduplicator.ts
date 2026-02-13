import { memoryManager, Memory } from './memory-manager'
import { vectorStore } from './vector-store'
import { LLMAgent } from '../llm/llm-agent'

/**
 * Memory Deduplicator
 * Detects and merges duplicate or near-duplicate memories
 */

export class MemoryDeduplicator {
    private readonly DUPLICATE_THRESHOLD = 0.92 // 92% similarity = duplicate
    private readonly DISTILL_THRESHOLD = 3      // Multiple occurrences trigger distillation
    private llmAgent: LLMAgent | null = null

    /**
     * Find and merge duplicate memories
     */
    async deduplicate(): Promise<number> {
        const allMemories = await memoryManager.getAllMemories()
        let mergedCount = 0
        const processed = new Set<string>()

        for (const mem of allMemories) {
            if (processed.has(mem.id)) continue

            // Find similar memories
            const similar = await vectorStore.search(mem.content, {
                limit: 5,
                threshold: this.DUPLICATE_THRESHOLD
            })

            const duplicates: Memory[] = []

            for (const result of similar) {
                const dupMem: Memory | undefined = allMemories.find((m: Memory) => m.id === result.metadata?.id)
                if (dupMem && dupMem.id !== mem.id && !processed.has(dupMem.id)) {
                    duplicates.push(dupMem)
                }
            }

            if (duplicates.length > 0) {
                await this.mergeDuplicates(mem, duplicates)
                mergedCount += duplicates.length
                processed.add(mem.id)
                duplicates.forEach(d => processed.add(d.id))
            }
        }

        console.log(`[Deduplicator] Merged ${mergedCount} duplicate memories`)
        return mergedCount
    }

    /**
     * Merge duplicate memories into one
     */
    private async mergeDuplicates(primary: Memory, duplicates: Memory[]): Promise<void> {
        // Combine tags
        const allTags = new Set([...primary.tags, ...duplicates.flatMap(d => d.tags)])

        // Combine metadata
        const combinedMetadata: Record<string, any> = { ...primary.metadata }
        for (const dup of duplicates) {
            if (dup.metadata) {
                Object.assign(combinedMetadata, dup.metadata)
            }
        }

        // Keep highest confidence and add a corroboration boost
        const maxConfidence = Math.max(primary.confidence, ...duplicates.map(d => d.confidence))
        const corroborationBoost = Math.min(0.1, duplicates.length * 0.02)

        // Sum use counts
        const totalUseCount = primary.useCount + duplicates.reduce((sum, d) => sum + d.useCount, 0)

        // Update primary memory
        const updated: Partial<Memory> = {
            ...primary,
            tags: Array.from(allTags),
            metadata: combinedMetadata,
            confidence: Math.min(1, maxConfidence + corroborationBoost),
            useCount: totalUseCount,
            updatedAt: Date.now()
        }

        await memoryManager.updateMemory(primary.id, updated as Memory)

        // Delete duplicates
        for (const dup of duplicates) {
            await memoryManager.forget(dup.id)
        }

        console.log(`[Deduplicator] Merged ${duplicates.length} duplicates into ${primary.id} (New confidence: ${updated.confidence})`)
    }

    /**
     * Wisdom Compression: Distill repetitive memories into Heuristics
     */
    async distill(): Promise<number> {
        if (!this.llmAgent) this.llmAgent = new LLMAgent()

        const allMemories = await memoryManager.getAllMemories()
        const learningMemories = allMemories.filter(m => m.type === 'learning' || m.type === 'pattern')
        let distilledCount = 0
        const processed = new Set<string>()

        for (const mem of learningMemories) {
            if (processed.has(mem.id)) continue

            // Find clusters of related memories
            const cluster = await vectorStore.search(mem.content, {
                limit: 10,
                threshold: 0.8 // Lower threshold for clustering
            })

            const relevantMemories = cluster
                .map(c => allMemories.find(m => m.id === c.metadata?.id))
                .filter((m): m is Memory => !!m && !processed.has(m.id))

            if (relevantMemories.length >= this.DISTILL_THRESHOLD) {
                console.log(`[Deduplicator] Distilling cluster of ${relevantMemories.length} memories...`)

                const context = relevantMemories.map(m => `- ${m.content} (Successes: ${m.successRate * 100}%)`).join('\n')
                const prompt = `Observe the following learned patterns and successes. Synthesize them into a single, permanent "Agent Heuristic" or "Mental Model" that is concise and actionable:
                
                Learnings:
                ${context}
                
                The result should be a high-level rule or wisdom that Rami Bot can use in the future.`

                try {
                    const heuristic = await this.llmAgent.process(prompt, { mode: 'reasoning' })

                    // Save Heuristic
                    await memoryManager.remember({
                        type: 'learning',
                        category: 'heuristic',
                        content: heuristic,
                        confidence: 0.95,
                        tags: ['heuristic', 'wisdom-compression', ...new Set(relevantMemories.flatMap(m => m.tags))],
                        source: 'self'
                    })

                    // Forget/Archive source memories
                    for (const m of relevantMemories) {
                        await memoryManager.forget(m.id)
                        processed.add(m.id)
                    }

                    distilledCount++
                } catch (error: any) {
                    console.error('[Deduplicator] Distillation failed:', error.message)
                }
            }
        }

        console.log(`[Deduplicator] Wisdom Compression: Created ${distilledCount} new heuristics`)
        return distilledCount
    }

    /**
     * Schedule daily maintenance job
     */
    startMaintenanceLoop(): void {
        const DAY_MS = 24 * 60 * 60 * 1000

        setInterval(async () => {
            console.log('[Deduplicator] Running daily maintenance...')
            await this.deduplicate()
            await this.distill()
        }, DAY_MS)

        console.log('[Deduplicator] Maintenance loop scheduled')
    }
}

export const memoryDeduplicator = new MemoryDeduplicator()
