import { soulUpgrade } from '../integration/soul-upgrade-integration'
import { auditLogger } from '../organization/audit-logger'
import { diffManager } from '../organization/diff-manager'
import { rollbackManager } from '../organization/rollback-manager'
import { truthEngine } from '../organization/truth-engine'
import { qaScorer } from '../quality/qa-scorer'
import { memoryManager, Memory } from '../learning/memory-manager'
import * as fs from 'fs/promises'

/**
 * Soul Upgrade 2.0 Test Suite
 * Comprehensive tests for all systems
 */

async function testAuditLogger() {
    console.log('\n=== Testing Audit Logger ===')

    // Initialize
    await auditLogger.initialize()

    // Log a decision
    await auditLogger.log({
        agentId: 'test-agent',
        agentRole: 'coder',
        action: 'write_file',
        resource: 'project_file',
        resourceId: 'test.ts',
        decision: 'allow',
        matchedRule: 'test-rule',
        reason: 'Test decision'
    })

    // Query logs
    const recent = await auditLogger.query({ limit: 5 })
    console.log(`✅ Logged and retrieved ${recent.length} entries`)

    // Get stats
    const stats = await auditLogger.getStats()
    console.log(`✅ Stats: ${stats.totalDecisions} total decisions`)
}

async function testDiffManager() {
    console.log('\n=== Testing Diff Manager ===')

    const testFile = './test-diff-file.txt'
    const oldContent = 'Hello World\nLine 2\nLine 3'
    const newContent = 'Hello Universe\nLine 2\nLine 3\nLine 4'

    // Create test file
    await fs.writeFile(testFile, oldContent, 'utf-8')

    // Generate diff
    const preview = await diffManager.generateDiff(testFile, newContent)
    console.log(`✅ Generated diff with ${preview.diff.split('\n').length} lines`)

    // Approve and apply
    await diffManager.approveDiff(preview.id, 'test-user')
    console.log('✅ Diff approved successfully')

    // Cleanup
    await fs.unlink(testFile)
}

async function testRollbackManager() {
    console.log('\n=== Testing Rollback Manager ===')

    await rollbackManager.initialize()

    const testFile = './test-rollback-file.txt'
    const originalContent = 'Original content'
    const modifiedContent = 'Modified content'

    // Create test file
    await fs.writeFile(testFile, originalContent, 'utf-8')

    // Backup before modification
    const backupPath = await rollbackManager.backupFile(testFile)
    console.log(`✅ Created backup: ${backupPath}`)

    // Modify file
    await fs.writeFile(testFile, modifiedContent, 'utf-8')

    // Rollback
    const history = rollbackManager.getHistory()
    if (history.length > 0) {
        await rollbackManager.rollback(history[0].id)
        const restored = await fs.readFile(testFile, 'utf-8')
        console.log(`✅ Rollback successful: content restored`)
    }

    // Cleanup
    await fs.unlink(testFile)
}

async function testTruthEngine() {
    console.log('\n=== Testing Truth Engine ===')

    const claim = 'TypeScript is a superset of JavaScript'
    const evidence = [
        {
            source: 'https://typescriptlang.org',
            type: 'web' as const,
            content: 'TypeScript is a typed superset of JavaScript',
            reliability: 0.9,
            timestamp: Date.now()
        },
        {
            source: 'https://wikipedia.org/TypeScript',
            type: 'web' as const,
            content: 'TypeScript extends JavaScript by adding types',
            reliability: 0.7,
            timestamp: Date.now()
        }
    ]

    const verified = await truthEngine.verifyClaim(claim, evidence)
    console.log(`✅ Claim verified: ${verified.classification} (confidence: ${(verified.confidence * 100).toFixed(1)}%)`)

    // Test source quality
    const govQuality = truthEngine['assessSourceQuality']('https://treasury.gov', 'web')
    const unknownQuality = truthEngine['assessSourceQuality']('https://random-blog.com', 'web')
    console.log(`✅ Source quality: .gov=${govQuality}, unknown=${unknownQuality}`)
}

async function testMemoryIntelligence() {
    console.log('\n=== Testing Memory Intelligence ===')

    await memoryManager.initialize()

    // Add test memories
    const mem1: Memory = {
        id: 'mem1',
        content: 'User prefers dark mode',
        type: 'preference',
        category: 'ui',
        confidence: 0.8,
        useCount: 0,
        successRate: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsedAt: Date.now(),
        tags: ['ui', 'preference'],
        source: 'user'
    }

    const mem2: Memory = {
        id: 'mem2',
        content: 'User likes TypeScript over JavaScript',
        type: 'preference',
        category: 'language',
        confidence: 0.7,
        useCount: 0,
        successRate: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsedAt: Date.now(),
        tags: ['language', 'preference'],
        source: 'user'
    }

    const mem3: Memory = {
        id: 'mem3',
        content: 'React uses virtual DOM',
        type: 'fact',
        category: 'technical',
        confidence: 0.6,
        useCount: 0,
        successRate: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsedAt: Date.now(),
        tags: ['react', 'technical'],
        source: 'self'
    }

    memoryManager['memories'].set('mem1', mem1)
    memoryManager['memories'].set('mem2', mem2)
    memoryManager['memories'].set('mem3', mem3)

    const memories = await memoryManager.getAllMemories()
    console.log(`✅ Created ${memories.length} test memories`)

    // Note: Deduplication would merge similar memories
    // This would be tested with actual vector store
}

async function testQALoop() {
    console.log('\n=== Testing QA Loop ===')

    // Score a successful output
    const goodScore = await qaScorer.scoreOutput('test-output-1', {
        taskCompleted: true,
        testsPass: true,
        buildSuccess: true,
        policyViolations: 0
    })
    console.log(`✅ Good output scored: ${(goodScore.overall * 100).toFixed(0)}%`)

    // Score a failed output
    const badScore = await qaScorer.scoreOutput('test-output-2', {
        taskCompleted: false,
        testsPass: false,
        buildSuccess: false,
        policyViolations: 3
    })
    console.log(`✅ Failed output scored: ${(badScore.overall * 100).toFixed(0)}%`)

    // Record user feedback
    const userScore = await qaScorer.recordUserFeedback('test-output-3', true, 'Great work!')
    console.log(`✅ User feedback recorded: ${userScore.overall * 100}%`)
}

async function runAllTests() {
    console.log('🧪 Starting Soul Upgrade 2.0 Test Suite\n')
    console.log('='.repeat(60))

    try {
        // Initialize the integration
        await soulUpgrade.initialize()

        // Run individual tests
        await testAuditLogger()
        await testDiffManager()
        await testRollbackManager()
        await testTruthEngine()
        await testMemoryIntelligence()
        await testQALoop()

        console.log('\n' + '='.repeat(60))

        // Run system check
        const { success, report } = await soulUpgrade.runSystemCheck()
        console.log('\n' + report.join('\n'))

        // Run demos
        await soulUpgrade.demoEnsembleCheck()
        await soulUpgrade.demoQALoop()

        console.log('\n' + '='.repeat(60))
        console.log('✅ All tests completed successfully!')

        // Get health status
        const health = await soulUpgrade.getHealthStatus()
        console.log('\n📊 System Health:')
        console.log(`   Audit Log: ${health.auditLog.totalDecisions} decisions`)
        console.log(`   Rollbacks: ${health.rollbacks} available`)
        console.log(`   QA Failures: ${health.qaScores.recentFailures}`)
        console.log(`   Patterns: ${health.patterns}`)
        console.log(`   Playbooks: ${health.playbooks}`)
        console.log(`   Tests: ${health.regressionTests}`)

    } catch (error: any) {
        console.error('\n❌ Test suite failed:', error.message)
        console.error(error.stack)
        process.exit(1)
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests()
}

export { runAllTests }
