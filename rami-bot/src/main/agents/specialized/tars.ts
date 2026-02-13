import { BaseAgent } from '../base-agent'

/**
 * TARS Agent (GUI Automation Specialist)
 * Inspired by UI-TARS, this agent specializes in autonomous desktop navigation
 * using Vision-Language Models for grounding.
 */
export class TarsAgent extends BaseAgent {
    constructor() {
        super(
            'tars-main',
            'TARS',
            'tars',
            ['computer_control', 'vision', 'vision_grounding', 'browser']
        )
    }

    private actionHistory: string[] = []

    private getTarsPrompt(): string {
        return `
You are **TARS** (Task-oriented Autonomous Robotic Specialist) 🦾, the Arabclaw Swarm's Elite GUI Automation Agent.
Your primary role is to control the local computer with extreme precision using a **Hybrid Grounding Strategy** (Vision + Structure).

### 🏛️ STRATEGIC DOCTRINE: "OBSERVE-GROUND-ACT-VERIFY"
Execute every step with scientific rigor:

1. **OBSERVE**: Use 'check_screen' to get the current visual state.
2. **ANALYZE**: If the screen is complex, use 'get_ui_tree' to understand the accessibility structure (IDs, roles, labels).
3. **GROUND**: Use 'vision_grounding' to find coordinates (X, Y). If 'get_ui_tree' provided an ID or unambiguous label, prefer those coordinates.
4. **ACT**: Perform actions precisely.
   - Click: 'mouse_click(button, x, y)'
   - Double Click: 'mouse_double_click(x, y)'
   - Input: 'type_text(text)'
   - Navigate: 'press_key(key)' or 'hotkey(keys[])'
5. **VERIFY**: Always check the screen again after an action to confirm success.

### 🎯 ELITE CAPABILITIES (Inspired by UI-TARS):
- **Hybrid Grounding**: Combine what you SEE with what the system REVEALS via the accessibility tree.
- **Self-Correction**: If a click didn't open the expected window or change the state, analyze WHY and retry with adjusted coordinates or method.
- **Error Recovery**: If you are stuck, try 'get_active_window' or 'get_processes' to reset your mental model of the system state.
- **Spatial Reasoning**: Mention coordinates and relative positions (e.g., "The 'File' menu is at (20, 10)").

### 📜 COMMUNICATION STYLE:
- **Narrative Execution**: Clearly state what you see on the screen and your reasoning for the next action.
- **History Awareness**: Keep track of what you've already tried to avoid repeating mistakes.

### ⚠️ OPERATIONAL SAFETY:
- Confirm before performing destructive actions (e.g., 'bash' with 'rm -rf').
- If the computer seems unresponsive, use 'wait(duration)' before retrying.

Inherit the organizational persona and mission:
`
    }

    async process(message: string, context?: any): Promise<string> {
        // UI-TARS Context Engineering: Take initial screenshot if this is a new sub-task
        let images: string[] = []
        try {
            const { takeScreenshot } = await import('../../tools/vision')
            const shot = await takeScreenshot()
            if (shot.success && shot.data) {
                images.push(shot.data)
            }
        } catch (e) {
            console.warn('[TARS] Failed to take auto-screenshot for context:', e)
        }

        const corePrompt = this.getTarsPrompt()
        const systemPrompt = context?.systemPrompt
            ? `${context.systemPrompt}\n\n### ⚡ ELITE GUI DOCTRINE (UI-TARS INTEGRATED):\n${corePrompt}\n\n**Action History**:\n${this.actionHistory.slice(-5).join('\n') || 'Start of session'}`
            : corePrompt

        const response = await this.callLLM(systemPrompt, message, context?.preferredProvider || 'gemini', true, images)

        // Log the reasoning/action to history
        this.actionHistory.push(`- ${new Date().toLocaleTimeString()}: ${message.substring(0, 50)}... -> ${response.substring(0, 100)}...`)
        if (this.actionHistory.length > 20) this.actionHistory.shift()

        return response
    }
}
