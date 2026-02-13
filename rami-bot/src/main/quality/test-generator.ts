import { QAScore } from './qa-scorer'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

/**
 * Test Generator
 * Auto-generates regression tests from failures
 */

export interface RegressionTest {
    id: string
    name: string
    input: string
    expectedOutput: string
    actualOutput: string
    category: 'build' | 'test' | 'policy' | 'runtime'
    createdAt: number
}

export class TestGenerator {
    private tests: Map<string, RegressionTest> = new Map()
    private testsPath: string

    constructor() {
        const userDataPath = app?.getPath('userData') || '.'
        this.testsPath = path.join(userDataPath, 'regression-tests', 'tests.json')
    }

    /**
     * Initialize test generator
     */
    async initialize(): Promise<void> {
        await fs.mkdir(path.dirname(this.testsPath), { recursive: true })
        await this.load()
        console.log(`[TestGenerator] Loaded ${this.tests.size} regression tests`)
    }

    /**
     * Generate test from failure
     */
    async generateFromFailure(score: QAScore, input: string, actualOutput: string, expectedOutput: string): Promise<RegressionTest> {
        const test: RegressionTest = {
            id: `test_${Date.now()}`,
            name: `Regression test for ${score.outputId}`,
            input,
            expectedOutput,
            actualOutput,
            category: this.categorizeFail(score),
            createdAt: Date.now()
        }

        this.tests.set(test.id, test)
        await this.save()

        console.log(`[TestGenerator] Created regression test: ${test.id}`)
        return test
    }

    /**
     * Categorize failure
     */
    private categorizeFail(score: QAScore): 'build' | 'test' | 'policy' | 'runtime' {
        if (!score.feedback) return 'runtime'

        const feedback = score.feedback.toLowerCase()

        if (feedback.includes('build') || feedback.includes('compile')) return 'build'
        if (feedback.includes('test')) return 'test'
        if (feedback.includes('policy')) return 'policy'

        return 'runtime'
    }

    /**
     * Get all tests
     */
    getAllTests(): RegressionTest[] {
        return Array.from(this.tests.values())
    }

    /**
     * Get tests by category
     */
    getTestsByCategory(category: string): RegressionTest[] {
        return Array.from(this.tests.values())
            .filter(t => t.category === category)
    }

    /**
     * Export tests to file (for integration with testing framework)
     */
    async exportTests(outputPath: string): Promise<void> {
        const tests = this.getAllTests()
        const testCode = this.generateTestCode(tests)
        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        await fs.writeFile(outputPath, testCode, 'utf-8')
        console.log(`[TestGenerator] Exported ${tests.length} tests to ${outputPath}`)
    }

    /**
     * Export a single test to a specific path
     */
    async exportSingleTest(testId: string, outputPath: string): Promise<void> {
        const test = this.tests.get(testId)
        if (!test) throw new Error(`Test ${testId} not found`)

        const testCode = this.generateTestCode([test])
        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        await fs.writeFile(outputPath, testCode, 'utf-8')
        console.log(`[TestGenerator] Exported single test ${testId} to ${outputPath}`)
    }

    /**
     * Generate test code
     */
    private generateTestCode(tests: RegressionTest[]): string {
        const lines: string[] = [
            '// Auto-generated regression tests',
            '// DO NOT EDIT MANUALLY',
            '',
            'import { describe, it, expect } from \'vitest\'',
            'import { synergyManager } from \'../../organization/synergy-manager\'',
            '',
            'describe(\'Regression Tests\', () => {'
        ]

        for (const test of tests) {
            lines.push(`  it('${test.name.replace(/'/g, "\\'")}', async () => {`)
            lines.push(`    // Category: ${test.category}`)
            lines.push(`    // Failure context: Actual was ${JSON.stringify(test.actualOutput).substring(0, 100)}...`)
            lines.push(`    const input = ${JSON.stringify(test.input)};`)
            lines.push(`    const expected = ${JSON.stringify(test.expectedOutput)};`)
            lines.push(``)
            lines.push(`    const result = await synergyManager.processTask(input);`)
            lines.push(`    expect(result.output || result).toContain(expected);`)
            lines.push(`  })`)
            lines.push(``)
        }

        lines.push('})')

        return lines.join('\n')
    }

    /**
     * Load tests from disk
     */
    private async load(): Promise<void> {
        try {
            const data = await fs.readFile(this.testsPath, 'utf-8')
            const loaded = JSON.parse(data)
            this.tests = new Map(Object.entries(loaded))
        } catch {
            // File doesn't exist yet
        }
    }

    /**
     * Save tests to disk
     */
    private async save(): Promise<void> {
        await fs.mkdir(path.dirname(this.testsPath), { recursive: true })
        const data = Object.fromEntries(this.tests)
        await fs.writeFile(this.testsPath, JSON.stringify(data, null, 2), 'utf-8')
    }
}

export const testGenerator = new TestGenerator()
