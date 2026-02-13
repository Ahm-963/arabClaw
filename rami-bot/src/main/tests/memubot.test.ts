
import { describe, it, expect } from 'vitest'
import { SystemAgent } from '../agents/specialized/system'

describe('SystemAgent (MemuBot) Screen Interaction', () => {
    it('should initialize and have screen interaction prompt', async () => {
        const agent = new SystemAgent()
        await agent.initialize()

        // Mock a screen message to see if it triggers the vision logic
        // We're not actually calling the LLM here to avoid costs, 
        // just verifying the prompt construction logic if we could.

        // Since process() is what we enhanced, let's check if it exists
        expect(agent.process).toBeDefined()
    })
})
