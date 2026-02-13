/**
 * Standalone Agent Verification Script
 */

import { synergyManager } from '../organization/synergy-manager';
import { app } from 'electron';
import { vi } from 'vitest'; // Although not in vitest runner, tsx can handle vitest if configured, but let's use a simpler mock

// Manual mock for Electron app if needed
if (!(app as any).getPath) {
    (app as any).getPath = (key: string) => `./test-data/${key}`;
}

async function runVerification() {
    console.log('--- AGENT MANAGEMENT VERIFICATION ---');

    try {
        await synergyManager.initialize();

        // 1. Creation Test
        const agent = await synergyManager.createAgent({
            name: 'Test Logic Agent',
            role: 'tester',
            level: 'junior'
        }, 'user');
        console.log(`Agent Creation Test: ${agent.name === 'Test Logic Agent' ? '✅' : '❌'}`);

        // 2. Core Protection Test
        const ceo = Array.from((synergyManager as any).agents.values()).find((a: any) => a.level === 'ceo');
        if (ceo) {
            const failTerm = await synergyManager.terminateAgent((ceo as any).id, 'Reason', 'user');
            console.log(`CEO Termination Protection: ${failTerm === false ? '✅' : '❌'}`);
        }

        // 3. Normal Termination
        const termSuccess = await synergyManager.terminateAgent(agent.id, 'Reason', 'user');
        console.log(`Normal Agent Termination: ${termSuccess === true ? '✅' : '❌'}`);

    } catch (err: any) {
        console.log(`Agent Verification Failed: ${err.message} ❌`);
    }
}

runVerification().catch(err => console.error(err));
