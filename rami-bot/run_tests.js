const { execSync } = require('child_process');
const fs = require('fs');
try {
    const output = execSync('npx vitest run src/main/tests/vision-full.test.ts --reporter verbose --no-color', { encoding: 'utf8' });
    fs.writeFileSync('vision_test_output.txt', output);
} catch (error) {
    fs.writeFileSync('vision_test_output.txt', (error.stdout || '') + (error.stderr || ''));
}
