import { appEvents } from '../events'
import { settingsManager } from '../settings'

/**
 * Chaos Manager (Ghost in the Machine)
 * Simulates real-world failures to test swarm resilience.
 */
export class ChaosManager {
    private static instance: ChaosManager
    private activeExperiments: Set<string> = new Set()

    private constructor() {
        console.log('[ChaosManager] Ghost in the Machine initialized.')
    }

    public static getInstance(): ChaosManager {
        if (!ChaosManager.instance) {
            ChaosManager.instance = new ChaosManager()
        }
        return ChaosManager.instance
    }

    /**
     * Get current chaos status
     */
    public getStatus() {
        const settings = settingsManager.getSettingsSync()
        return {
            globalEnabled: settings.chaosMode || false,
            activeExperiments: Array.from(this.activeExperiments)
        }
    }

    /**
     * Start a chaos experiment
     */
    public startExperiment(type: 'latency' | 'tool_failure' | 'exhaustion') {
        this.activeExperiments.add(type)
        console.warn(`[ChaosManager] EXPERIMENT STARTED: ${type}`)
        appEvents.emit('chaos:experiment_started', { type })
    }

    /**
     * Stop a chaos experiment
     */
    public stopExperiment(type: string) {
        this.activeExperiments.delete(type)
        console.log(`[ChaosManager] EXPERIMENT STOPPED: ${type}`)
        appEvents.emit('chaos:experiment_stopped', { type })
    }

    /**
     * Stop all chaos experiments
     */
    public stopAllExperiments() {
        this.activeExperiments.clear()
        console.log('[ChaosManager] ALL EXPERIMENTS STOPPED')
    }

    /**
     * Check if a specific chaos effect should be applied
     */
    public shouldApply(type: string): boolean {
        // Check global setting first
        const settings = settingsManager.getSettingsSync()
        if (!settings.chaosMode) return false

        return this.activeExperiments.has(type)
    }

    /**
     * Simulates latency if the experiment is active
     */
    public async applyLatency(ms: number = 2000): Promise<void> {
        if (this.shouldApply('latency')) {
            console.log(`[ChaosManager] Injecting ${ms}ms latency...`)
            await new Promise(resolve => setTimeout(resolve, ms))
        }
    }

    /**
     * Intercepts tool calls and potentially injects failure
     */
    public interceptTool(toolName: string): void {
        if (this.shouldApply('tool_failure')) {
            // 30% chance of failure
            if (Math.random() < 0.3) {
                console.error(`[ChaosManager] INJECTING FAILURE for tool: ${toolName}`)
                throw new Error(`Chaos Failure: Tool '${toolName}' is temporarily unavailable due to network instability.`)
            }
        }
    }
}

export const chaosManager = ChaosManager.getInstance()
