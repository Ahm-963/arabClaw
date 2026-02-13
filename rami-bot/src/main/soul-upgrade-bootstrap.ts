import { app, BrowserWindow } from 'electron'
import { soulUpgrade } from './integration/soul-upgrade-integration'
import { settingsManager } from './settings'
import { memoryManager } from './learning/memory-manager'

/**
 * Soul Upgrade 2.0 Bootstrap
 * Add this to your main.ts to enable all features
 */

export async function initializeSoulUpgrade() {
    console.log('\n🚀 Initializing Soul Upgrade 2.0...\n')

    try {
        // Wait for Electron app to be ready
        if (!app.isReady()) {
            await app.whenReady()
        }

        // Initialize core systems first
        await settingsManager.initialize()
        await memoryManager.initialize()

        // Initialize Soul Upgrade 2.0
        await soulUpgrade.initialize()

        // Start background jobs
        await soulUpgrade.startBackgroundJobs()

        // Run system health check
        const { success, report } = await soulUpgrade.runSystemCheck()
        console.log('\n' + report.join('\n'))

        if (!success) {
            console.warn('⚠️ Some Soul 2.0 systems have issues - check logs')
        }

        // Get initial health status
        const health = await soulUpgrade.getHealthStatus()
        console.log('\n📊 Soul 2.0 Health Status:')
        console.log(`   Audit Log: ${health.auditLog.totalDecisions} decisions`)
        console.log(`   Rollbacks: ${health.rollbacks} available`)
        console.log(`   Playbooks: ${health.playbooks} loaded`)
        console.log(`   Regression Tests: ${health.regressionTests} generated`)

        console.log('\n✅ Soul Upgrade 2.0 ready!\n')

        return success

    } catch (error: any) {
        console.error('\n❌ Soul Upgrade 2.0 initialization failed:', error.message)
        console.error(error.stack)
        return false
    }
}

/**
 * Usage in main.ts:
 * 
 * import { initializeSoulUpgrade } from './soul-upgrade-bootstrap'
 * 
 * app.whenReady().then(async () => {
 *   await initializeSoulUpgrade()
 *   // ... rest of your app initialization
 * })
 */
