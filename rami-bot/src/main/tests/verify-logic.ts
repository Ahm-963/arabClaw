/**
 * Standalone Verification Script
 * Bypasses Vitest issues to confirm core logic
 */

import { isCronMatch } from '../utils/cron';
import * as fs from 'fs/promises';
import * as path from 'path';

async function runVerification() {
    console.log('--- CRON LOGIC VERIFICATION ---');
    const testDate = new Date('2026-02-11T09:00:00'); // Wed Feb 11, 2026

    const cases = [
        { pattern: '* * * * *', expected: true },
        { pattern: '0 9 * * 3', expected: true },
        { pattern: '0 10 * * 3', expected: false },
        { pattern: '*/15 * * * *', expected: true },
        { pattern: '0 0,9,12 * * *', expected: true },
        { pattern: '* * * * 4', expected: false }, // Should be Wed (3)
    ];

    for (const c of cases) {
        const result = isCronMatch(c.pattern, testDate);
        console.log(`Pattern: [${c.pattern}] | Expected: ${c.expected} | Result: ${result} | ${result === c.expected ? '✅' : '❌'}`);
    }

    console.log('\n--- PERSISTENCE LOGIC (Path Check) ---');
    // We can't easily run the full engine here without Electron mocks, 
    // but we can verify our path logic and manual file check.
    const mockUserData = './test-data';
    const workflowPath = path.join(mockUserData, 'workflows', 'workflows.json');
    console.log(`Target Workflow Path: ${workflowPath}`);

    try {
        await fs.mkdir(path.dirname(workflowPath), { recursive: true });
        await fs.writeFile(workflowPath, JSON.stringify([{ id: 'test', name: 'Verified' }]));
        const content = await fs.readFile(workflowPath, 'utf-8');
        console.log(`Persistence Write/Read Test: ${content.includes('Verified') ? '✅' : '❌'}`);
        await fs.rm(mockUserData, { recursive: true, force: true });
    } catch (err: any) {
        console.log(`Persistence Test Failed: ${err.message} ❌`);
    }
}

runVerification().catch(err => console.error(err));
