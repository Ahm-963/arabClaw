import { getSystemInfo } from '../main/tools/system-info'
import { executeCommand } from '../main/tools/bash'
import { fileEditor } from '../main/tools/file-editor'
import { getMousePosition } from '../main/tools/computer'
import * as path from 'path'
import * as os from 'os'

async function runVerification() {
    console.log('--- STARTING RAMI BOT TOOL VERIFICATION ---')
    const results: Record<string, boolean> = {}

    // 1. System Info
    console.log('\n[1/4] Testing System Info...')
    try {
        const info = await getSystemInfo()
        if (info.success && info.data.platform) {
            console.log('✅ System Info:', info.data.platform, info.data.release)
            results['system-info'] = true
        } else {
            console.error('❌ System Info Failed:', info.error)
            results['system-info'] = false
        }
    } catch (e: any) {
        console.error('❌ System Info Exception:', e.message)
        results['system-info'] = false
    }

    // 2. Computer Control (Mouse Position)
    console.log('\n[2/4] Testing Computer Control (Mouse)...')
    try {
        const mouse = await getMousePosition()
        if (mouse.success) {
            console.log(`✅ Mouse Position: ${mouse.data.x}, ${mouse.data.y}`)
            results['computer'] = true
        } else {
            console.error('❌ Mouse Position Failed:', mouse.error)
            results['computer'] = false
        }
    } catch (e: any) {
        console.error('❌ Computer Control Exception:', e.message)
        results['computer'] = false
    }

    // 3. File Editor & Bash Combo
    console.log('\n[3/4] Testing File Editor & Bash...')
    const testFile = path.join(os.tmpdir(), 'rami_test_verification.txt')
    try {
        // Create
        const create = await fileEditor({
            command: 'create',
            path: testFile,
            file_text: 'Verification Test Content'
        })

        if (create.success) {
            console.log('✅ File Created')

            // Read
            const read = await fileEditor({ command: 'view', path: testFile })
            if (read.success && read.data?.includes('Verification Test Content')) {
                console.log('✅ File Read Verified')

                // Delete using Bash
                const delParams = os.platform() === 'win32' ? `del "${testFile}"` : `rm "${testFile}"`
                const del = await executeCommand(delParams)
                if (del.success) {
                    console.log('✅ File Deleted via Bash')
                    results['filesystem'] = true
                } else {
                    console.error('❌ File Delete Failed:', del.error)
                    results['filesystem'] = false
                }
            } else {
                console.error('❌ File Read Failed:', read.error)
                results['filesystem'] = false
            }
        } else {
            console.error('❌ File Create Failed:', create.error)
            results['filesystem'] = false
        }
    } catch (e: any) {
        console.error('❌ Filesystem Exception:', e.message)
        results['filesystem'] = false
    }

    // 4. Bash Command
    console.log('\n[4/4] Testing Generic Bash Command...')
    try {
        const cmd = await executeCommand('echo "Hello Rami"')
        if (cmd.success && cmd.output?.includes('Hello Rami')) {
            console.log('✅ Bash Echo Verified')
            results['bash'] = true
        } else {
            console.error('❌ Bash Echo Failed:', cmd.error)
            results['bash'] = false
        }
    } catch (e: any) {
        console.error('❌ Bash Exception:', e.message)
        results['bash'] = false
    }

    console.log('\n--- VERIFICATION SUMMARY ---')
    console.table(results)

    const allPassed = Object.values(results).every(v => v === true)
    if (allPassed) {
        console.log('\n✨ ALL TESTS PASSED! The Mind is functional.')
        process.exit(0)
    } else {
        console.error('\n⚠️ SOME TESTS FAILED.')
        process.exit(1)
    }
}

runVerification()
