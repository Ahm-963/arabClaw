import { TarsAgent } from '../agents/specialized/tars'
import { appEvents } from '../events'
import { settingsManager } from '../settings'
import * as path from 'path'
import * as fs from 'fs/promises'

async function runTarsTest() {
    console.log('--- Starting TARS Reliability Test ---')

    // 1. Initialize
    const tars = new TarsAgent()

    // Ensure we have a provider configured
    const settings = await settingsManager.getSettings()
    if (!settings.googleGeminiApiKey && !settings.claudeApiKey && !settings.openaiApiKey) {
        console.error('Error: No LLM API key configured for testing.')
        return
    }

    console.log(`Using provider: ${settings.llmProvider}`)

    // 2. Mock some events to see what's happening
    appEvents.on('agent:activity', (data) => {
        console.log(`[Activity] ${data.type}: ${data.details || ''} ${data.toolName || ''}`)
    })

    // 3. Simple GUI Task
    const task = "Find the 'Recycle Bin' on the desktop and move the mouse to it. Then right-click it."

    console.log(`Task: ${task}`)

    try {
        const result = await tars.process(task, {
            systemPrompt: "You are testing your own capabilities. Be precise. Use Observe-Ground-Act."
        })

        console.log('--- TARS Execution Result ---')
        console.log(result)
        console.log('--- Test Complete ---')
    } catch (error: any) {
        console.error('Test Failed:', error.message)
    }
}

// Only run if called directly
if (require.main === module) {
    runTarsTest().catch(console.error)
}

export { runTarsTest }
