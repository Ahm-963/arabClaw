import { memoryManager } from '../learning/memory-manager'
import { goalManager } from '../organization/goal-manager'

async function verifyCognitiveSkills() {
    console.log('Starting Cognitive Skills Verification...');

    // 1. Verify Memory
    console.log('\n--- Testing MemoryManager ---');
    await memoryManager.initialize();

    // Remember
    console.log('Remembering a fact...');
    const fact = await memoryManager.remember({
        content: 'Rami Bot loves coding in TypeScript',
        category: 'test_fact',
        tags: ['test', 'coding', 'preference']
    });
    console.log(`Stored: ${fact.content} (ID: ${fact.id})`);

    // Recall
    console.log('Recalling the fact...');
    const recalled = await memoryManager.recall('loves coding');
    if (recalled.length > 0 && recalled[0].content.includes('TypeScript')) {
        console.log('PASS: Recalled correct memory!');
    } else {
        console.error('FAIL: Could not recall memory.');
        console.log('Recalled:', recalled);
    }

    // 2. Verify Goals
    console.log('\n--- Testing GoalManager ---');
    await goalManager.initialize();

    // Create Goal
    console.log('Creating a goal...');
    const goal = await goalManager.createGoal('Verify Cognitive Skills Implementation');
    console.log(`Goal Created: ${goal.description} (ID: ${goal.id})`);

    // Add Subtasks
    console.log('Adding subtasks...');
    await goalManager.addSubtasks(goal.id, [
        { description: 'Test Memory', priority: 1 },
        { description: 'Test Goals', priority: 1 }
    ]);

    const activeGoal = await goalManager.getActiveGoal();
    if (activeGoal && activeGoal.subtasks.length === 2) {
        console.log('PASS: Subtasks added successfully!');
        console.log('Active Goal Subtasks:', activeGoal.subtasks.map(t => t.description));
    } else {
        console.error('FAIL: Subtasks verification failed.');
    }

    // cleanup
    // await memoryManager.forget(fact.id);
    console.log('\nVerification Complete.');
}

verifyCognitiveSkills().catch(console.error);
