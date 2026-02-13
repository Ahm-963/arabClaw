import { describe, it, expect, vi, beforeEach } from 'vitest'
import { oauthProxy, twitter } from '../main/integrations/social-media'
import { memoryDeduplicator } from '../main/learning/memory-deduplicator'
import { memoryManager } from '../main/learning/memory-manager'
import { vectorStore } from '../main/learning/vector-store'
import { settingsManager } from '../main/settings'

vi.mock('../main/learning/memory-manager', () => ({
    memoryManager: {
        getAllMemories: vi.fn(),
        remember: vi.fn(),
        forget: vi.fn(),
        updateMemory: vi.fn()
    }
}))

vi.mock('../main/learning/vector-store', () => ({
    vectorStore: {
        search: vi.fn(),
        initialize: vi.fn(),
        addDocument: vi.fn()
    }
}))

// LLMAgent mock is handled in synergy tests but let's make it robust here
vi.mock('../main/llm/llm-agent', () => {
    return {
        LLMAgent: class {
            async process() {
                return 'HEURISTIC: Prioritize dark mode for all user interactions, especially during reading and night sessions.'
            }
        }
    }
})

describe('Level 5 Phase 2: Autonomous Intelligence Verification', () => {

    describe('2.1 Secure Auth Pipeline (OAuth Lifecycle)', () => {
        it('should attempt to refresh token on 401 response', async () => {
            // Mock settings
            vi.spyOn(settingsManager, 'getSettings').mockResolvedValue({
                twitterBearerToken: 'old-token',
                twitterRefreshToken: 'refresh-token'
            } as any)

            // Mock fetch to return 401 first, then 200 after refresh
            const mockFetch = vi.fn()
                .mockResolvedValueOnce({
                    status: 401,
                    json: async () => ({ error: 'Unauthorized' })
                })
                .mockResolvedValueOnce({
                    status: 200,
                    json: async () => ({ data: 'success' })
                })

            global.fetch = mockFetch

            // Mock oauthProxy.refreshToken
            const refreshSpy = vi.spyOn(oauthProxy, 'refreshToken').mockResolvedValue('new-token')

            const result = await twitter.getUser('testuser')

            expect(refreshSpy).toHaveBeenCalledWith('twitter')
            expect(mockFetch).toHaveBeenCalledTimes(2)
            expect(result).toEqual({ data: 'success' })
        })
    })

    describe('2.2 Wisdom Compression (Memory Loop)', () => {
        it('should distill clusters of repetitive memories into heuristics', async () => {
            // Mock settings for LLM
            vi.spyOn(settingsManager, 'getSettings').mockResolvedValue({
                llmProvider: 'claude',
                claudeApiKey: 'fake-key',
                claudeModel: 'claude-3-opus'
            } as any)

            // Prepare mock memories
            const mockMemories = [
                { id: 'm1', content: 'User prefers dark mode for reading', type: 'learning', useCount: 5, successRate: 1, tags: ['ui'] },
                { id: 'm2', content: 'Always set theme to dark during night sessions', type: 'learning', useCount: 3, successRate: 1, tags: ['theme'] },
                { id: 'm3', content: 'Dark mode is the priority for the user', type: 'learning', useCount: 4, successRate: 1, tags: ['pref'] }
            ]

            vi.mocked(memoryManager.getAllMemories).mockResolvedValue(mockMemories as any)

            // Mock vector search to return the cluster
            vi.mocked(vectorStore.search).mockResolvedValue([
                { metadata: { id: 'm1' } },
                { metadata: { id: 'm2' } },
                { metadata: { id: 'm3' } }
            ] as any)

            try {
                const count = await memoryDeduplicator.distill()
                expect(count).toBe(1)
                expect(memoryManager.remember).toHaveBeenCalledWith(expect.objectContaining({
                    category: 'heuristic'
                }))
                expect(memoryManager.forget).toHaveBeenCalledTimes(3)
            } catch (error: any) {
                console.error('Test failed with error:', error.message)
                throw error
            }
        })
    })
})
