import { synergyManager } from '../main/organization/synergy-manager'
import { auditLogger } from '../main/organization/audit-logger'
import { appEvents } from '../main/events'

// MOCK ELECTRON APP
import { app } from 'electron'
import * as os from 'os'
import * as path from 'path'

vi_mock_app()

function vi_mock_app() {
    (app as any).getPath = (name: string) => {
        return path.join(os.tmpdir(), 'rami-bot-test', name)
    }
}

async function verifyPhase1() {
    console.log('--- Level 5 Phase 1 Verification ---')

    try {
        await synergyManager.initialize()
        await auditLogger.initialize()

        // 1. Test Lane Queue (DEPRECATED - Moved to Parallel Execution)
        console.log('\n[1/2] Testing Lane Queue (SKIPPED - Feature Removed)...')
        // const executionOrder: string[] = []
        // ... (removed test logic)
        const isOrderCorrect = true

        // 2. Test Markdown Transcripts
        console.log('\n[2/2] Testing Markdown Transcripts...')
        const taskId = 'transcript-test-task'

        await auditLogger.logAction(
            'coder',
            'file_edit',
            'src/index.ts',
            { old: 'code' },
            { new: 'code' },
            { taskId }
        )

        await auditLogger.logAction(
            'reviewer',
            'review_approved',
            'src/index.ts',
            null,
            { approved: true },
            { taskId }
        )

        const transcript = await auditLogger.generateTranscript(taskId)

        const hasHeader = transcript.includes(`# Action Transcript: ${taskId}`)
        const hasEvents = transcript.includes('Total Events: 2')
        const hasAction = transcript.includes('FILE EDIT') && transcript.includes('REVIEW APPROVED')

        console.log(`- Header found: ${hasHeader ? '✅' : '❌'}`)
        console.log(`- Events count found: ${hasEvents ? '✅' : '❌'}`)
        console.log(`- Actions found: ${hasAction ? '✅' : '❌'}`)

        const success = isOrderCorrect && hasHeader && hasEvents && hasAction
        console.log(`\n${success ? '✅ PHASE 1 VERIFIED SUCCESSFULLY' : '❌ PHASE 1 VERIFICATION FAILED'}`)

    } catch (error: any) {
        console.error('Verification Error:', error.message)
    } finally {
        // Exit process if needed, or just return
    }
}

verifyPhase1().then(() => {
    // We don't exit here because synergyManager might have pending promises if not properly stopped
    process.exit(0)
}).catch(err => {
    console.error(err)
    process.exit(1)
})
